-- Create schemas for each microservice
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS tender;
CREATE SCHEMA IF NOT EXISTS notification;

-- Grant permissions
GRANT ALL ON SCHEMA auth TO chadia;
GRANT ALL ON SCHEMA tender TO chadia;
GRANT ALL ON SCHEMA notification TO chadia;
