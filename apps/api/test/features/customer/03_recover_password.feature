@customer @recover_password
Feature: Recover password
  As a customer
  I want to recover my password when I lost it

  Rules:
  - Save recover password request (recover_password_token, recover_password_requested_at)
  - Remove password
  - Send an email containing a link to update password

  Scenario: Recover password on an existing customer
    Given a set of customers are already registered:
      | email                   | password | phoneNumber | firstname | lastname |
      | valentin@pupucecorp.com | valentin | 0601020304  | Valentin  | Dosimont |
    And a recover password request with "valentin@pupucecorp.com"
    When the customer wants to recover his password
    Then the password reset request should succeed without revealing account existence
    And a reset email should have been sent to "valentin@pupucecorp.com"

  Scenario: Recover password on a non-existent customer stays enumeration-safe
    Given a recover password request with "unknown@pupucecorp.com"
    When the customer wants to recover his password
    Then the password reset request should succeed without revealing account existence
    And no reset email should have been sent