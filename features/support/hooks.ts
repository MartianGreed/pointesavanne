import { Before, BeforeAll, AfterAll } from '@cucumber/cucumber'

BeforeAll(async function () {
  // Global setup if needed
})

AfterAll(async function () {
  // Global cleanup if needed
})

Before(async function () {
  // Reset state before each scenario - handled by World constructor
  this.requestException = null
  this.executeException = null
  this.registrationRequest = null
  this.registrationResponse = null
  this.loginRequest = null
  this.loginResponse = null
  this.saveProfileRequest = null
  this.saveProfileResponse = null
  this.recoverPasswordRequest = null
  this.recoverPasswordResponse = null
  this.updatePasswordRequest = null
  this.updatePasswordResponse = null
  this.quotationRequest = null
  this.quotationResponse = null
  this.quotationGenerationRequest = null
  this.quotationGenerationResponse = null
  this.quotationSignedRequest = null
  this.quotationSignedResponse = null
  this.villa = null
})
