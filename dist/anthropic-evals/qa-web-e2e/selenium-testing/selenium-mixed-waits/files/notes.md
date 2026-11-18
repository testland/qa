- Sometimes the test takes 40+ seconds and fails with TimeoutException although the spinner is gone.
- Sometimes it fails with NoSuchElementException for `.spinner` when the spinner was very quick.
- Sometimes StaleElementReferenceException on `total.getText()`: the cart re-renders the summary
  after a coupon is applied.
