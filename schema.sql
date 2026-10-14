-- SplitCalc schema. Run once:  mysql -u root -p < schema.sql
-- If you already have the old `expenses` table, keep a backup first:
--   RENAME TABLE expenses TO expenses_old;

CREATE DATABASE IF NOT EXISTS splitwise_calculator;
USE splitwise_calculator;

CREATE TABLE IF NOT EXISTS expense_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_member_per_group (group_id, name),
  FOREIGN KEY (group_id) REFERENCES expense_groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT NULL,
  amount DECIMAL(10,2) NOT NULL,
  paid_by INT NOT NULL,
  split_type ENUM('equal','percentage','custom') NOT NULL DEFAULT 'equal',
  expense_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES expense_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by) REFERENCES members(id)
);

-- One row per person per expense: what that person owes for it
CREATE TABLE IF NOT EXISTS expense_shares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  expense_id INT NOT NULL,
  member_id INT NOT NULL,
  share_amount DECIMAL(10,2) NOT NULL,
  UNIQUE KEY uniq_share (expense_id, member_id),
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- "from_member paid to_member" to settle up
CREATE TABLE IF NOT EXISTS settlements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  from_member INT NOT NULL,
  to_member INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES expense_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (from_member) REFERENCES members(id),
  FOREIGN KEY (to_member) REFERENCES members(id)
);
