<?php
declare(strict_types=1);

namespace App\Application\Controller;

use App\Domain\Booking\Pricing\Price;
use Bref\Micro\Controller;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Twig\Environment;

final class HomeController extends Controller
{
    public function __construct(private readonly Environment $twig)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        return $this->htmlResponse($this->twig->render('pdf/quotation.html.twig', [
            'numeric_id' => 1,
            'address' => [
                'name' => 'Valentin Dosimont',
                'line1' => '25 place Grégoire Bordillon',
                'line2' => null,
                'line3' => '49100 Angers',
                'phone' => '0782848227',
                'email' => 'valentin.dosimont@gmail.com',
            ],
            'pricing' => [
                'nightsIn' => 14,
                'household_tax' => new Price(200),
                'total_amount' => new Price(3040),
                'tourist_tax' => new Price(50.40),
            ],
            'from' => '30/05/2022',
            'to' => '13/06/2022',
            'total_occupants' => 6,
            'adults_count' => 4,
            'children_count' => 2,
            'created_at' => '27/05/2022',
        ]));
    }
}