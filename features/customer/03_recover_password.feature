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
    Then there should be no errors RecoverPasswordResponse
    And RecoverPasswordResponse should contain "An email has been sent, please check your inbox."

  Scenario: Recover password on a non-existent customer
    Given a recover password request with "valentin@pupucecorp.com"
    When the customer wants to recover his password
    Then I expect an exception class "App\Domain\Customer\Exception\CustomerNotFoundException" to be thrown