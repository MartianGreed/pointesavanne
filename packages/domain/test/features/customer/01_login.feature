@customer @login
Feature: Login
  In order to book the villa
  As a customer
  I need to identify myself to the system

  Rules:
  - Identify myself to the system
  - loggedInAt to track user last login

  Scenario: Login with an email that doesn't exist
    Given a login request with "valentin@pupucecorp.com" and "valentin"
    When the customer wants to login
    Then I expect an exception class "InvalidCredentials" to be thrown

  Scenario: Login with an email that is not correctly formatted
    Given a login request with "valentin@pupucecorp" and "valentin"
    When the customer wants to login
    Then I expect an exception class "InvalidCredentials" to be thrown

  Scenario: Login with an existing account
    Given a login request with "valentin@pupucecorp.com" and "v@lent1n"
    And the customer "valentin@pupucecorp.com" and "v@lent1n" is registered in database
    When the customer wants to login
    Then there should be no errors
    And session id should be set

  Scenario: Login with a wrong password
    Given a login request with "valentin@pupucecorp.com" and "v@lent1n"
    And the customer "valentin@pupucecorp.com" and "valentin" is registered in database
    When the customer wants to login
    And the error should be "InvalidCredentials"
