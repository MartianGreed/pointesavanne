@booking @quotation_request
Feature: Estimation
  As a customer
  I want to book the villa for a given amount of time.
  Whenever a customer is requesting a booking a quotation request is created including :

  Rules:
  - the total amount of the booking period
  - the amount of the tourist tax
  - the amount of the deposit
  - confirmation rules
  - cancellation rules
  - the reminder about the caution and the household

  Background:
    Given a villa "Villa de standing - Pointe Savanne" with a caution amount of "2 000 €" and the mandatory household of "200 €"
    And a discount over time set as :
      | from | to | discountAmount |
      | 8    | 14 | 10%            |
      | 15   | 21 | 15%            |
    And the following pricing range :
      | from       | to         | baseAmount |
      | 05/03/2022 | 06/05/2022 | 1890 €     |
      | 07/05/2022 | 01/07/2022 | 1600 €     |
      | 02/07/2022 | 26/08/2022 | 1700 €     |
      | 27/08/2022 | 21/10/2022 | 1600 €     |
      | 22/10/2022 | 16/12/2022 | 1700 €     |
      | 17/12/2022 | 01/01/2023 | 2090 €     |
      | 02/01/2023 | 03/02/2023 | 1890 €     |
      | 04/02/2023 | 03/03/2023 | 2090 €     |
      | 04/03/2023 | 05/05/2023 | 1890 €     |
      | 06/05/2023 | 30/06/2023 | 1600 €     |
      | 01/07/2023 | 25/08/2023 | 1700 €     |
      | 26/08/2023 | 20/10/2023 | 1600 €     |
      | 21/10/2023 | 15/12/2023 | 1700 €     |
      | 16/12/2023 | 31/12/2023 | 2090 €     |
    And a set of customers are already registered:
      | email                      | password   | phoneNumber | firstname     | lastname |
      | valentin@pupucecorp.com    | valentin   | 0601020304  | Valentin      | Dosimont |
      | cloe.maz@gmail.com         | cloemaz29  | 0602030405  | Cloé          | Mazeau   |
      | jean-baptiste@domergue.net | jbdomergue | 0603040506  | Jean-Baptiste | Domergue |

  Scenario: Invalid booking dates
    Given "valentin@pupucecorp.com" is logged in
    And a QuotationRequest to villa named "Villa de standing - Pointe Savanne" from "30/05/2022" to "13/05/2022" for 4 adults and 2 children
    When the customer submits the QuotationRequest
    Then an exception "InvalidBookingEndDateException" should be thrown with message "End date 13/05/2022 cannot be before start date 30/05/2022"

  Scenario: Booking is not available for given time period
    Given "valentin@pupucecorp.com" is logged in
    And villa named "Villa de standing - Pointe Savanne" is booked :
      | customer                   | from       | to         | adults | children |
      | jean-baptiste@domergue.net | 28/05/2022 | 04/06/2022 | 2      | 0        |
    And a QuotationRequest to villa named "Villa de standing - Pointe Savanne" from "30/05/2022" to "13/06/2022" for 4 adults and 2 children
    When the customer submits the QuotationRequest
    Then an exception "BookingUnavailableException" should be thrown with message "Booking is unavailable for dates 30/05/2022 - 13/06/2022"

  Scenario: Simple booking for period
    Given "valentin@pupucecorp.com" is logged in
    And a QuotationRequest to villa named "Villa de standing - Pointe Savanne" from "30/05/2022" to "13/06/2022" for 4 adults and 2 children
    When the customer submits the QuotationRequest
    Then it should be accepted with a total amount of "3 040,00 €", a tourist tax of "50,40 €" unranked and "84,00 €" with a 4 star rating ranking and a deposit amount of "2 000,00 €"
    And 2 emails should have been sent
    And an "BookingHasBeenRequested" event at index 0 has been dispatched

  Scenario: Booking for a single week checking unranked tax get max value of 2.35
    Given "valentin@pupucecorp.com" is logged in
    And a QuotationRequest to villa named "Villa de standing - Pointe Savanne" from "06/02/2023" to "13/02/2023" for 2 adults and 0 children
    When the customer submits the QuotationRequest
    Then it should be accepted with a total amount of "2 090,00 €", a tourist tax of "32,90 €" unranked and "21,00 €" with a 4 star rating ranking and a deposit amount of "2 000,00 €"
    And 2 emails should have been sent
    And an "BookingHasBeenRequested" event at index 0 has been dispatched

  Scenario: Booking for a three weeks check 15% discount is properly applied
    Given "valentin@pupucecorp.com" is logged in
    And a QuotationRequest to villa named "Villa de standing - Pointe Savanne" from "06/02/2023" to "27/02/2023" for 2 adults and 0 children
    When the customer submits the QuotationRequest
    Then it should be accepted with a total amount of "5 747,50 €", a tourist tax of "98,70 €" unranked and "63,00 €" with a 4 star rating ranking and a deposit amount of "2 000,00 €"
    And 2 emails should have been sent
    And an "BookingHasBeenRequested" event at index 0 has been dispatched
