@booking @quotation_signed
Feature: Quotation has been signed
  As a customer
  I want to accept the quotation I've received

  Rules:
  - Once I received an email containing the quotation OR downloading them on customer area
  - I'll sign them manually and upload them directly on customer area
  - When the upload is complete, send the quotation acception to admin

  - Booking have to transition state from "quotation-requested" to "quotation-validation-pending"
  - Send an email to admin to notify the booking have changed state and that new documents are available


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
      | email                      | password   | phoneNumber | firstname     | lastname | line1                       | line2 | line3        |
      | valentin@pupucecorp.com    | valentin   | 0601020304  | Valentin      | Dosimont | 25 place Grégoire Bordillon | NULL  | 49100 Angers |
      | cloe.maz@gmail.com         | cloemaz29  | 0602030405  | Cloé          | Mazeau   | NULL                        | NULL  | NULL         |
      | jean-baptiste@domergue.net | jbdomergue | 0603040506  | Jean-Baptiste | Domergue | NULL                        | NULL  | NULL         |


  Scenario: When the file has not been uploaded properly
    Given "valentin@pupucecorp.com" is logged in
    And "Villa de standing - Pointe Savanne" has a quotation request by "valentin@pupucecorp.com" from "30/05/2022" to "13/06/2022" for 4 adults and 2 children
    And quotation has been generated
    When customer has signed quotation
    Then I expect an exception class "FileNotFoundException" to be thrown

  Scenario: File is uploaded properly
    Given "valentin@pupucecorp.com" is logged in
    And "Villa de standing - Pointe Savanne" has a quotation request by "valentin@pupucecorp.com" from "30/05/2022" to "13/06/2022" for 4 adults and 2 children
    And quotation has been generated
    And the signed quotation is uploaded
    When customer has signed quotation
    Then 1 emails should have been sent
    And the booking should in state "quotation-signed"
