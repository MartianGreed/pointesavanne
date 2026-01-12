@customer @profile
Feature: Save profile
  As a customer
  I want to save my profile to provide some basic informations during booking the villa

  Rules:
  - Have a firstname and lastname - Asked while registering
  - Have a valid e-mail and phoneNumber - Asked while registering
  - Have a preferredLanguage

  Scenario: Save profile that already has basic informations
    Given a set of customers are already registered:
      | email                   | password | phoneNumber | firstname | lastname |
      | valentin@pupucecorp.com | valentin | 0601020304  | Valentin  | Dosimont |
    And a save profile request with "valentin@pupucecorp.com" and:
      | language | line1                       | line3        |
      | fr_FR    | 25 place Grégoire Bordillon | 49100 Angers |
    When the customer wants to save his profile
    Then there should be no errors on SaveProfileResponse

  Scenario: Save profile with updated values
    Given a set of customers are already registered:
      | email                   | password | phoneNumber | firstname        | lastname    |
      | valentin@pupucecorp.com | valentin | 0782848227  | ValentinLamentin | Dosimontoto |
    And a save profile request with "valentin@pupucecorp.com" and:
      | language | firstname | lastname |
      | en_GB    | Valentin  | Dosimont |
    When the customer wants to save his profile
    Then there should be no errors on SaveProfileResponse
