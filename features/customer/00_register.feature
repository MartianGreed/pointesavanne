@customer @register
Feature: Customer registration
  In order to book the villa
  As a Customer
  In need to save my informations

  Rules:
  - password needs encryption
  - use email as username and identifier

  Scenario: Registering simple user
    Given a request with following informations "valentin@pupucecorp.com", "v@lent1n", "0782848227", "Valentin", "Dosimont"
    When the customer wants to register
    Then it should be registered

  Scenario: Registering with an email that already exists
    Given a request with following informations "valentin@pupucecorp.com", "v@lent1n", "0782848227", "Valentin", "Dosimont"
    And a set of customers are already registered:
      | email                      | password   | phoneNumber | firstname     | lastname |
      | valentin@pupucecorp.com    | valentin   | 0601020304  | Valentin      | Dosimont |
      | cloe.maz@gmail.com         | cloemaz29  | 0602030405  | Cloé          | Mazeau   |
      | jean-baptiste@domergue.net | jbdomergue | 0603040506  | Jean-Baptiste | Domergue |
    When the customer wants to register
    Then RegistrationResponse should contain one error message saying "Customer with email valentin@pupucecorp.com already exists. Please recover your password"

  Scenario: Registering with a bad password
    Given a request with following informations "valentin@pupucecorp.com", "val", "0782848227", "Valentin", "Dosimont"
    When the customer wants to register
    Then I expect an "Password is too short. Password has to be 8 chars min" to be thrown