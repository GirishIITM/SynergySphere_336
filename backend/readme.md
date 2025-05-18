CREATE DATABASE odoo;

CREATE USER 'odoo'@'localhost' IDENTIFIED WITH mysql_native_password BY 'odoo336';

GRANT ALL PRIVILEGES ON odoo.* TO 'odoo'@'localhost';

FLUSH PRIVILEGES;

