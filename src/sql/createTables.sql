-- createNewTables.sql

-- Create the entries table
CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME NOT NULL,
  product_name TEXT CHECK(product_name IN (
    'seven_up_250ml', 'sprite_250ml', 'pepsi_250ml', 'aquafina_500ml', 'kk_medley', 'bottle', 'cup'
  )) NOT NULL,
  entry_type TEXT CHECK(entry_type IN ('IN', 'OUT')) NOT NULL,
  count INTEGER NOT NULL
);

-- Create the stock table
CREATE TABLE IF NOT EXISTS stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME NOT NULL,
  seven_up_250ml INTEGER DEFAULT 0,
  sprite_250ml INTEGER DEFAULT 0,
  pepsi_250ml INTEGER DEFAULT 0,
  aquafina_500ml INTEGER DEFAULT 0,
  kk_medley INTEGER DEFAULT 0,
  bottle INTEGER DEFAULT 0,
  cup INTEGER DEFAULT 0
);
