@booking @lead
Feature: Quotation lead — the anonymous devis funnel
  As a visitor without an account
  I want my devis request kept for me while I create my account
  So that my request and my details are already there when I first sign in

  Rules:
  - a lead is identified by its e-mail: a newer submission replaces the pending one
  - claiming happens at sign-in: it fills an absent profile and creates the quotation request
  - a saved profile is authoritative and never overwritten by a lead
  - a claimed lead is consumed even when the booking could not be created

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

  Scenario: A visitor's lead becomes a quotation request on first sign-in
    Given a visitor "marie.dupont@mail.com" named "Marie" "Dupont" with phone "+596 696 12 34 56"
    And the visitor submits a quotation lead from "30/05/2022" to "13/06/2022" for 4 adults with message "Arrivée tardive vers 20 h"
    And "marie.dupont@mail.com" registers and signs in
    When the quotation leads are claimed for "marie.dupont@mail.com"
    Then the lead should be converted to one booking with a total amount of "3 040,00 €"
    And the profile of "marie.dupont@mail.com" should read "Marie", "Dupont", "+596 696 12 34 56"
    And 2 emails should have been sent
    And the admin email should quote the visitor's message "Arrivée tardive vers 20 h"
    And the booking should in state "quotation-requested"

  Scenario: A newer lead replaces the pending one for the same e-mail
    Given a visitor "marie.dupont@mail.com" named "Marie" "Dupont" with phone "+596 696 12 34 56"
    And the visitor submits a quotation lead from "30/05/2022" to "13/06/2022" for 4 adults
    And the visitor submits a quotation lead from "16/05/2022" to "23/05/2022" for 2 adults
    And "marie.dupont@mail.com" registers and signs in
    When the quotation leads are claimed for "marie.dupont@mail.com"
    Then the lead should be converted to one booking with a total amount of "1 600,00 €"
    And 2 emails should have been sent

  Scenario: Claiming without a pending lead is a no-op
    Given a set of customers are already registered:
      | email                   | password | phoneNumber | firstname | lastname |
      | valentin@pupucecorp.com | valentin | 0601020304  | Valentin  | Dosimont |
    And "valentin@pupucecorp.com" is logged in
    When the quotation leads are claimed for "valentin@pupucecorp.com"
    Then no booking should be created by the claim

  Scenario: A lead whose dates were taken in the meantime is consumed with an issue
    Given a visitor "marie.dupont@mail.com" named "Marie" "Dupont" with phone "+596 696 12 34 56"
    And the visitor submits a quotation lead from "30/05/2022" to "13/06/2022" for 4 adults
    And "marie.dupont@mail.com" registers and signs in
    And villa named "Villa de standing - Pointe Savanne" is booked :
      | customer                 | from       | to         | adults | children |
      | valentin@pupucecorp.com  | 28/05/2022 | 04/06/2022 | 2      | 0        |
    When the quotation leads are claimed for "marie.dupont@mail.com"
    Then no booking should be created by the claim
    And the claim should report the issue "Booking is unavailable for dates 30/05/2022 - 13/06/2022"

  Scenario: A saved profile is never overwritten by a lead
    Given a set of customers are already registered:
      | email                   | password | phoneNumber | firstname | lastname |
      | valentin@pupucecorp.com | valentin | 0601020304  | Valentin  | Dosimont |
    And a visitor "valentin@pupucecorp.com" named "Valentine" "Dosimonta" with phone "0698 98 98 98"
    And the visitor submits a quotation lead from "30/05/2022" to "13/06/2022" for 2 adults
    When the quotation leads are claimed for "valentin@pupucecorp.com"
    Then the lead should be converted to one booking with a total amount of "3 040,00 €"
    And the profile of "valentin@pupucecorp.com" should read "Valentin", "Dosimont", "0601020304"
