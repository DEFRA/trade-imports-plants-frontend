import { describe, expect, it } from 'vitest'

import { driveHandler } from '../../../../../../engine/test-support.js'
import { offeredForRole } from '../../../../../../services/address-book/index.js'
import { STUB_BOOK } from '../../../../../../services/address-book/stub/index.js'
import { useStubbedHighRiskPlantsJourney } from '../../test-support.js'
import { copy as pickerCopy } from './copy/copy.en.js'
import { ADDRESSES_A_PAGE, pageCountOf } from './pagination.js'

const pickerOn = async (get, seed, page) => {
  const result = await driveHandler(get, {
    seed: seed(),
    query: { page: String(page) }
  })
  return result.view.context.picker
}

const pageNumbersOf = (offeredCount) =>
  Array.from({ length: pageCountOf(offeredCount) }, (_, index) => index + 1)

const idsOfferedFor = (role) =>
  STUB_BOOK.filter((record) => offeredForRole(record, role)).map(
    (record) => record.id
  )

/**
 * The paging cases every address picker's GET route shares. A picker whose
 * stub list runs past one page gets the cases a second page needs; one whose
 * list fits on a page gets the no-paging case.
 *
 * @param {object} picker
 * @param {string} picker.pickerName - the page's name, for the describe
 * @param {Function} picker.get - the page's GET handler
 * @param {Function} picker.seed - gives the journey state the page opens on
 * @param {string} [picker.role] - the address-book role the page asks for
 * @param {number} picker.wholeCount - how many stub records this picker offers
 */
export const describePaging = ({ pickerName, get, seed, role, wholeCount }) => {
  const onFirstPage = Math.min(wholeCount, ADDRESSES_A_PAGE)
  const lastPage = pageCountOf(wholeCount)
  const runsPastOnePage = wholeCount > ADDRESSES_A_PAGE

  describe(`GET ${pickerName} — the page of results it holds`, () => {
    useStubbedHighRiskPlantsJourney()

    it('Should open on the first eight of the addresses it offers, counted against every one of them', async () => {
      const picker = await pickerOn(get, seed, 1)

      expect(picker.rows).toHaveLength(onFirstPage)
      expect(picker.resultsCount).toBe(
        pickerCopy.resultsCount(onFirstPage, wholeCount)
      )
    })

    it('Should offer, across its pages, every address it offers and no other', async () => {
      const pages = await Promise.all(
        pageNumbersOf(wholeCount).map((page) => pickerOn(get, seed, page))
      )
      const ids = pages.flatMap((picker) => picker.rows.map((row) => row.id))

      expect(ids).toEqual(idsOfferedFor(role))
    })

    if (runsPastOnePage) {
      it('Should offer paging onward from the first page', async () => {
        const picker = await pickerOn(get, seed, 1)

        expect(picker.pagination.next.href).toContain('page=2')
        expect(picker.pagination.items).toHaveLength(lastPage)
      })

      it('Should serve the last page, logged once, when the page asked for is past it', async () => {
        const pastTheLastPage = lastPage + 1
        const result = await driveHandler(get, {
          seed: seed(),
          query: { page: String(pastTheLastPage) }
        })

        expect(result.view.context.picker.page).toBe(lastPage)
        expect(result.logger.entries).toEqual([
          {
            level: 'info',
            message:
              'Address picker page is past the last page, serving the last page',
            fields: expect.objectContaining({
              requestedPage: pastTheLastPage,
              servedPage: lastPage
            })
          }
        ])
      })
    } else {
      it('Should offer no paging, because one page holds every address it offers', async () => {
        const picker = await pickerOn(get, seed, 1)

        expect(picker.pagination).toBeNull()
      })
    }

    it('Should serve the first page, logged once, when the page asked for is not a page number', async () => {
      const result = await driveHandler(get, {
        seed: seed(),
        query: { page: 'nonsense' }
      })

      expect(result.view.context.picker.page).toBe(1)
      expect(result.logger.entries).toEqual([
        {
          level: 'info',
          message:
            'Address picker page is not a page number, serving the first page',
          fields: expect.objectContaining({
            requestedPage: 'nonsense',
            servedPage: 1
          })
        }
      ])
    })
  })
}
