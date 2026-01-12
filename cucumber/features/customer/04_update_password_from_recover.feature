@customer @update_password
Feature: Update password from recover
  As a customer
  I want to update my password after clicking the link given in my email

  Rules:
  - find customer by RecoverPassword token
  - update the password if expiration date is not over
  - send confirmation email

  Background:
    Given a set of customers are already registered:
      | email                      | password   | phoneNumber | firstname     | lastname |
      | valentin@pupucecorp.com    | valentin   | 0601020304  | Valentin      | Dosimont |
      | cloe.maz@gmail.com         | cloemaz29  | 0602030405  | Cloé          | Mazeau   |
      | jean-baptiste@domergue.net | jbdomergue | 0603040506  | Jean-Baptiste | Domergue |

  Scenario: LoggedIn customer updates his password with his email and password
    Given "valentin@pupucecorp.com" is logged in
    And an UpdatePassword request with "valentin@pupucecorp.com", "valentin", "v@lent1n", "NULL"
    When the customer wants to update his password
    Then there should be no errors on UpdateProfileResponse

  Scenario: LoggedIn customer tries to update with a wrong password
    Given "valentin@pupucecorp.com" is logged in
    And an UpdatePassword request with "valentin@pupucecorp.com", "wrongp@ssw0rd", "v@lent1n", "NULL"
    When the customer wants to update his password
    Then I expect an exception class "InvalidCredentialsException" to be thrown

  Scenario: Customer updates his password from reset link
    And "valentin@pupucecorp.com" has made a RecoverPasswordRequest with token "635cad1c-9ca8-43a8-aab6-c04c97d810fd"
    And an UpdatePassword request with "NULL", "NULL", "v@lent1n", "635cad1c-9ca8-43a8-aab6-c04c97d810fd"
    When the customer wants to update his password
    Then there should be no errors on UpdateProfileResponse

  Scenario: Customer updates his password with a wrong token
    And "valentin@pupucecorp.com" has made a RecoverPasswordRequest with token "635cad1c-9ca8-43a8-aab6-c04c97d810fd"
    And an UpdatePassword request with "NULL", "NULL", "v@lent1n", "aWrongToken"
    When the customer wants to update his password
    Then I expect an exception class "CustomerNotFoundException" to be thrown
