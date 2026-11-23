import { describe, expect, it } from 'vitest'

import { driveHandler } from '../../../../../../engine/test-support.js'
import { useStubbedHighRiskPlantsJourney } from '../../test-support.js'
import { copy as pickerCopy } from './copy/copy.en.js'
import { ADDRESSES_A_PAGE, pageCountOf } from './pagination.js'

const PAST_THE_LAST_PAGE = 40

const pickerOn = async (get, seed, page) => {
  const result = await driveHandler(get, {
    seed: seed(),
    query: { page: String(page) }
  })
  return result.view.context.picker
}

const pageNumbersOf = (wholeCount) =>
  Array.from({ length: pageCountOf(wholeCount) }, (_, index) => index + 1)

/**
 * The paging cases every address picker's GET route shares.
 *
 * @param {object} picker
 * @param {string} picker.pickerName - the page's name, for the describe
 * @param {Function} picker.get - the page's GET handler
 * @param {Function} picker.seed - gives the journey state the page opens on
 * @param {number} picker.wholeCount - how many stub records this picker offers
 */
export const describePaging = ({ pickerName, get, seed, wholeCount }) => {
  const onFirstPage = Math.min(wholeCount, ADDRESSES_A_PAGE)
  const lastPage = pageCountOf(wholeCount)

  describe(`GET ${pickerName} — the page of results it holds`, () => {
    useStubbedHighRiskPlantsJourney()

    it("Should open on a page of the role's addresses, counted against every one the role holds", async () => {
      const picker = await pickerOn(get, seed, 1)

      expect(picker.rows).toHaveLength(onFirstPage)
      expect(picker.resultsCount).toBe(
        pickerCopy.resultsCount(onFirstPage, wholeCount)
      )
    })

    it('Should list every address for the role, and the role-less address, across its pages', async () => {
      const pages = await Promise.all(
        pageNumbersOf(wholeCount).map((page) => pickerOn(get, seed, page))
      )
      const ids = pages.flatMap((picker) => picker.rows.map((row) => row.id))

      expect(ids).toHaveLength(wholeCount)
      expect(new Set(ids).size).toBe(wholeCount)
    })

    it('Should offer paging only where the role holds more addresses than a page', async () => {
      const picker = await pickerOn(get, seed, 1)

      if (wholeCount > ADDRESSES_A_PAGE) {
        expect(picker.pagination.next.href).toContain('page=2')
      } else {
        expect(picker.pagination).toBeNull()
      }
    })

    it('Should serve the last page, logged once, when the page asked for is past it', async () => {
      const result = await driveHandler(get, {
        seed: seed(),
        query: { page: String(PAST_THE_LAST_PAGE) }
      })

      expect(result.view.context.picker.page).toBe(lastPage)
      expect(result.logger.entries).toEqual([
        {
          level: 'info',
          message:
            'Address picker page is past the last page, serving the last page',
          fields: expect.objectContaining({
            requestedPage: PAST_THE_LAST_PAGE,
            servedPage: lastPage
          })
        }
      ])
    })
  })
}
