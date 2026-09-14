require 'spec_helper'

RSpec.describe 'Checkout', type: :feature do
  before(:each) do
    @driver = build_driver
    sign_in
  end

  after(:each) do
    @driver.quit
  end

  it 'places an order for a single line item' do
    @driver.navigate.to "#{BASE_URL}/products/BOOK-001"
    wait.until { @driver.find_element(css: '[data-testid=add-to-cart]').enabled? }
    @driver.find_element(css: '[data-testid=add-to-cart]').click

    expect(@driver.find_element(css: '[data-testid=cart-count]').text).to eq('1')

    @driver.navigate.to "#{BASE_URL}/checkout"
    wait.until { @driver.find_element(css: '[data-testid=place-order]').enabled? }
    @driver.find_element(css: '[data-testid=place-order]').click

    wait.until { @driver.current_url.include?('/orders/') }
    expect(@driver.find_element(css: '[data-testid=order-confirmation]').text)
      .to include('Thank you')
  end

  it 'refuses an expired promo code' do
    @driver.navigate.to "#{BASE_URL}/cart"
    @driver.find_element(css: '[data-testid=promo-code]').send_keys('WINTER24')
    wait.until { @driver.find_element(css: '[data-testid=apply-promo]').enabled? }
    @driver.find_element(css: '[data-testid=apply-promo]').click

    wait.until { @driver.find_element(css: '[data-testid=promo-error]').displayed? }
    expect(@driver.find_element(css: '[data-testid=promo-error]').text)
      .to include('expired')
  end
end
