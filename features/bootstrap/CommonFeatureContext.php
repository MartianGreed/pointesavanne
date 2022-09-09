<?php

namespace Features\Context;

use Behat\Behat\Tester\Exception\PendingException;
use Webmozart\Assert\Assert;

trait CommonFeatureContext
{
    /**
     * @Transform /^NULL$/i
     */
    public function transformNull()
    {
        return null;
    }

    /**
     * @Then an exception :exceptionClass should be thrown with message :exceptionMessage
     */
    public function anExceptionShouldBeThrownWithMessage(string $exceptionClass, string $exceptionMessage)
    {
        if (null !== $this->requestException) {
            Assert::same(get_class($this->requestException), $exceptionClass);
            Assert::same($this->requestException->getMessage(), $exceptionMessage);
            return;
        }

        if (null !== $this->executeException) {
            Assert::same(get_class($this->executeException), $exceptionClass);
            Assert::same($this->executeException->getMessage(), $exceptionMessage);
        }
    }

    private function isTestEnv(): bool
    {
        return 'test' === getenv('APP_ENV');
    }
}