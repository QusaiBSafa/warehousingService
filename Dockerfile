FROM public.ecr.aws/bitnami/node:latest

WORKDIR /opt/backend

ARG envProfile=dev

ENV env_Profile=$envProfile
COPY . .

RUN yarn 

RUN yarn build

EXPOSE 3002
CMD yarn start:$env_Profile