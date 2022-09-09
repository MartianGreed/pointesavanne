<?php

declare(strict_types=1);

use App\Domain\AsyncMessage;
use App\Domain\Booking\BookingRepository;
use App\Domain\Booking\QuotationNumericIdGenerator;
use App\Domain\Customer\AuthenticationGateway;
use App\Domain\Customer\CustomerRepository;
use App\Domain\FileLocator;
use App\Domain\Mailer;
use App\Infrastructure\Behat\InMemoryAuthenticationGateway;
use App\Infrastructure\Behat\InMemoryBookingRepository;
use App\Infrastructure\Behat\InMemoryCustomerRepository;
use App\Infrastructure\Behat\InMemoryMessageQueue;
use App\Infrastructure\Behat\InMemoryQuotationNumericIdGenerator;
use App\Infrastructure\Email\InMemoryMailer;
use App\Infrastructure\File\LocalFileLocator;
use DI\Container;

return [
    // Customer
    CustomerRepository::class => static function (Container $c) {
        return $c->make(InMemoryCustomerRepository::class);
    },
    AuthenticationGateway::class => static function (Container $c) {
        return $c->make(InMemoryAuthenticationGateway::class);
    },

    // Booking
    BookingRepository::class => static function (Container $c) {
        return $c->make(InMemoryBookingRepository::class);
    },
    QuotationNumericIdGenerator::class => static function (Container $c) {
        return $c->make(InMemoryQuotationNumericIdGenerator::class);
    },

    // Shared
    Mailer::class => static function (Container $c) {
        return $c->make(InMemoryMailer::class, [
            'sender' => 'test-email@villapointesavanne.com',
        ]);
    },
    AsyncMessage::class => static function (Container $c) {
        return $c->make(InMemoryMessageQueue::class);
    },
    FileLocator::class => static function (Container $c) {
        return new LocalFileLocator($c->get('path.rootDir'));
    }
];
