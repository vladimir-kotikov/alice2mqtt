image:
	@docker build -t yandex2mqtt .

serve:
	@docker run --env-file=.env --net=host --rm -ti yandex2mqtt

lint:
	@pre-commit run --all
