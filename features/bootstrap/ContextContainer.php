<?php

namespace Features\Context;

use DI\Container;
use Psr\Container\ContainerInterface;

final class ContextContainer implements ContainerInterface
{
    private Container $container;

    public function __construct()
    {
        $this->container = require __DIR__. '/../../config/bootstrap.php';
    }
    public function get(string $id)
    {
        return $this->container->get($id);
    }

    public function has(string $id)
    {
        return $this->container->has($id);
    }
}