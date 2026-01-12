import { Before, After, BeforeAll, AfterAll } from '@cucumber/cucumber'
import type { TestWorld } from './world.ts'

BeforeAll(async function () {
  process.env.APP_ENV = 'test'
})

Before(async function (this: TestWorld) {
  this.reset()
})

After(async function (this: TestWorld) {
  try {
    await this.fileLocator.cleanFilesystem()
  } catch {
    // Ignore cleanup errors
  }
})

AfterAll(async function () {
  // Cleanup after all tests
})
