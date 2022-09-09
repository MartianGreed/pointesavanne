<?php

namespace App\Infrastructure\File;

use App\Domain\FileLocator;
use App\Domain\Shared\File\FileNotFoundException;
use App\Domain\Shared\PDF\File;

final class LocalFileLocator implements FileLocator
{
    private const TMP_PATH = '/tmp';

    public function __construct(private readonly string $rootDir)
    {
    }

    public function save(File $file, string $content): bool
    {
        $infos = pathinfo($file->location);
        if (!is_dir($this->getTmpPath().$infos['dirname'])) {
            if (!mkdir($concurrentDirectory = $this->getTmpPath().$infos['dirname'], 0775,
                    true) && !is_dir($concurrentDirectory)) {
                throw new \RuntimeException(sprintf('Directory "%s" was not created', $concurrentDirectory));
            }
        }

        file_put_contents($this->getTmpPath().$file->location, $content);
        return true;
    }

    public function locate(string $path): File
    {
        if (!file_exists($this->getTmpPath().$path)) {
            throw new FileNotFoundException($path);
        }

        return new File($path);
    }

    public function getContent(File $file): mixed
    {
        return file_get_contents($this->getTmpPath().$file->location);
    }

    public function cleanFilesystem(string $path = ''): void
    {
        $localFiles = scandir($this->getTmpPath().$path);
        if (!$localFiles) {
            throw new \RuntimeException('Could\'nt parse local filesystem');
        }

        $content = array_slice($localFiles, 2);
        foreach ($content as $fs) {
            $nestedPath = $this->getTmpPath().$path.$fs;
            if(is_dir($nestedPath)) {
                $this->cleanFilesystem($path.$fs.'/');
            }

            if (is_file($nestedPath)) {
                unlink($nestedPath);
            } else {
                rmdir($nestedPath);
            }
        }
    }

    private function getTmpPath(): string
    {
        return $this->rootDir.self::TMP_PATH.'/';
    }
}