<?php

use App\Domain\AsyncMessage;
use App\Domain\Booking\BookingRepository;
use App\Domain\Booking\Quotation\QuotationUseCase;
use App\Domain\Booking\QuotationSigned\QuotationSignedUseCase;
use App\Domain\Customer\AuthenticationGateway;
use App\Domain\Customer\PasswordEncoder;
use App\Domain\FileLocator;
use App\Domain\Mailer;
use App\Domain\Shared\PDF\PDFGenerator;
use App\Infrastructure\PDF\DOMPdfGenerator;
use App\Infrastructure\Symfony\SymfonyPasswordEncoder;
use Bref\Logger\StderrLogger;
use DI\Container;
use Psr\Log\LoggerInterface;
use Psr\Log\LogLevel;
use Symfony\Component\PasswordHasher\Hasher\SodiumPasswordHasher;
use Symfony\Component\PasswordHasher\PasswordHasherInterface;
use Twig\Environment;
use Twig\Loader\FilesystemLoader;
use function DI\autowire;
use function DI\get;

return [
    'path.cache' => '/tmp/cache',
    'path.templates' => dirname(__DIR__) . '/templates',
    'path.rootDir' => dirname(__DIR__),
    'admin.mail' => getenv('ADMIN_MAIL'),
    'owner.mail' => getenv('OWNER_MAIL'),

    // Domain
    PasswordEncoder::class => autowire(SymfonyPasswordEncoder::class)->constructor(get(PasswordHasherInterface::class)),

    // Booking
    QuotationUseCase::class => static function(Container $c) {
        return new QuotationUseCase(
            $c->get(BookingRepository::class),
            $c->get(AuthenticationGateway::class),
            $c->get(Mailer::class),
            $c->get(AsyncMessage::class),
            $c->get('admin.mail'),
        );
    },
    QuotationSignedUseCase::class => static function (Container $c) {
        return new QuotationSignedUseCase(
            $c->get(BookingRepository::class),
            $c->get(FileLocator::class),
            $c->get(Mailer::class),
            $c->get('owner.mail'),
        );
    },

    // Infra
    PasswordHasherInterface::class => static fn(Container $c) => new SodiumPasswordHasher(),
    LoggerInterface::class => static fn() => new StderrLogger(LogLevel::INFO),
    Environment::class => static function (Container $c) {
        $loader = new FilesystemLoader($c->get('path.templates'));

        $options = [];
        if ('prod' === getenv('APP_ENV')) {
            $options = array_merge($options, ['cache' => $c->get('path.cache')]);
        }
        return new Environment($loader, $options);
    },
    PDFGenerator::class => static function (Container $c) {
        return new DOMPdfGenerator($c->get(Environment::class), $c->get(FileLocator::class));
    }

];