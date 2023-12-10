## Description

This service responsible for reading events from kafka stream and save these events to the related table on redshift DB
It is also provided with APIs to do queries on these data. and we have report with counts of the recent events that we send daily to the warehouse-reports-prod slack channel.

## Run

Before running the service you need to create `config` folder under the main folder of the service
inside this folder please add this file https://drive.google.com/file/d/1PQSpZq5laKK7MM5I8fZuYBmxBg-CrXtH/view?usp=sharing
# yarn install

# yarn build

# yarn dev

or if you are using `vscode` go to `package.json -> scripts` then put the cursor above dev you will see `start`, `debug`.
