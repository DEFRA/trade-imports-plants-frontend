// @vitest-environment jsdom

import { createAll } from 'govuk-frontend'
import { beforeEach, describe, expect, it } from 'vitest'
import PickerPagingSelection from './picker-paging-selection.js'

const PICKER_PATH =
  '/high-risk-plants/notifications/GBN-PL-26-ABC123/consignors/select'

const render = () => {
  document.body.innerHTML = `
    <form method="post" novalidate data-module="app-picker-paging-selection">
      <input type="radio" name="consignor" value="northgate-trading-ag" />
      <input type="radio" name="consignor" value="aarhus-trading-aps" />
      <nav class="govuk-pagination">
        <a class="govuk-pagination__link" href="${PICKER_PATH}?q=den&amp;selected=lille-commerce-sarl">1</a>
        <a class="govuk-pagination__link" href="${PICKER_PATH}?q=den&amp;page=2&amp;selected=lille-commerce-sarl">2</a>
      </nav>
    </form>`
  document.body.classList.add('govuk-frontend-supported')
  createAll(PickerPagingSelection, undefined, { scope: document.body })
}

const pagingHrefs = () =>
  [...document.querySelectorAll('.govuk-pagination a')].map((link) =>
    link.getAttribute('href')
  )

const tick = (value) => {
  const radio = document.querySelector(`input[value="${value}"]`)
  radio.checked = true
  radio.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('PickerPagingSelection', () => {
  beforeEach(render)

  it('Should carry a ticked address through every paging link, keeping the search term and the page', () => {
    tick('aarhus-trading-aps')

    expect(pagingHrefs()).toEqual([
      `${PICKER_PATH}?q=den&selected=aarhus-trading-aps`,
      `${PICKER_PATH}?q=den&page=2&selected=aarhus-trading-aps`
    ])
  })

  it('Should replace the address the server rendered each time another is ticked', () => {
    tick('aarhus-trading-aps')
    tick('northgate-trading-ag')

    expect(pagingHrefs()).toEqual([
      `${PICKER_PATH}?q=den&selected=northgate-trading-ag`,
      `${PICKER_PATH}?q=den&page=2&selected=northgate-trading-ag`
    ])
  })

  it('Should leave the paging links alone until an address is ticked', () => {
    expect(pagingHrefs()).toEqual([
      `${PICKER_PATH}?q=den&selected=lille-commerce-sarl`,
      `${PICKER_PATH}?q=den&page=2&selected=lille-commerce-sarl`
    ])
  })
})
