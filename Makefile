behat:
	APP_ENV=test vendor/bin/behat -c behat.yml

behat_suite:
	APP_ENV=test vendor/bin/behat -c behat.yml --suite=$(suite)

unit_tests:
	APP_ENV=test vendor/bin/phpunit -c phpunit.xml.dist

test:
	APP_ENV=test vendor/bin/phpunit -c phpunit.xml.dist --filter $(class)

unit_tests_coverage:
	APP_ENV=test vendor/bin/phpunit -c phpunit.xml.dist --coverage-html coverage

phpstan:
	vendor/bin/phpstan analyse -c phpstan.neon --memory-limit=512M