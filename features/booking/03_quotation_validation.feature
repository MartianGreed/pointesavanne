@booking @quotation_validation
Feature: Accept a quotation request
  As the owner
  I can turn the quotation into a contract
  Rules:
  - Validate that the quotation is signed
  - If it's ok:
  - Generate contract
  - Open payment reservation
  - Send email with payment link
  - If it's not:
  - Send an explication email to the customer about why the quotation is not valid


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
