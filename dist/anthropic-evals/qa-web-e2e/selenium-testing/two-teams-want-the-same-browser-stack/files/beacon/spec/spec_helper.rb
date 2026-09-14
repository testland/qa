require 'selenium-webdriver'
require 'rspec'

BASE_URL = ENV.fetch('BASE_URL', 'http://localhost:3000')

module DriverSupport
  def build_driver
    options = Selenium::WebDriver::Chrome::Options.new
    options.add_argument('--headless=new')
    options.add_argument('--window-size=1440,900')
    Selenium::WebDriver.for(:chrome, options: options)
  end

  def wait
    @wait ||= Selenium::WebDriver::Wait.new(timeout: 10)
  end

  def sign_in(email: 'ops@beacon.example', password: 'test-password')
    @driver.navigate.to "#{BASE_URL}/login"
    @driver.find_element(css: '[data-testid=email]').send_keys(email)
    @driver.find_element(css: '[data-testid=password]').send_keys(password)
    @driver.find_element(css: 'button[type=submit]').click
    wait.until { @driver.find_element(css: '[data-testid=account-menu]').displayed? }
  end
end

RSpec.configure do |config|
  config.include DriverSupport
  config.formatter = :junit
  config.add_formatter('RspecJunitFormatter', 'tmp/rspec/results.xml')
end
