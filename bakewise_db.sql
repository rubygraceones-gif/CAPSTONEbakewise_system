-- BakeWise Enterprise Bakery Management System
-- MySQL / MariaDB Database Schema & Seed Data
-- Designed for XAMPP MySQL / phpMyAdmin

CREATE DATABASE IF NOT EXISTS `bakewise_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `bakewise_db`;

-- --------------------------------------------------------
-- Table structure for `bw_branches`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bw_branches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `latitude` FLOAT DEFAULT 300,
  `longitude` FLOAT DEFAULT 200,
  `address` TEXT,
  `status` VARCHAR(50) DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed `bw_branches`
INSERT INTO `bw_branches` (`id`, `name`, `latitude`, `longitude`, `address`, `status`) VALUES
(1, 'Main Branch (Central)', 620, 100, 'Agdao District, Davao City', 'Active'),
(2, 'North District Branch', 480, 170, 'Buhangin Flyover, Davao City', 'Active'),
(3, 'Eastside Hub Branch', 380, 230, 'Bajada Commercial Zone, Davao City', 'Active'),
(4, 'South Regional Branch', 240, 310, 'Matina Crossing, Davao City', 'Active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- --------------------------------------------------------
-- Table structure for `bw_users`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bw_users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `branch_id` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed `bw_users`
INSERT INTO `bw_users` (`id`, `email`, `password`, `name`, `role`, `branch_id`) VALUES
(1, 'manager@bakewise.com', 'password123', 'Branch Manager', 'manager', 1),
(2, 'sales@bakewise.com', 'password123', 'Sales Staff', 'sales', 1),
(3, 'inventory@bakewise.com', 'password123', 'Inventory Specialist', 'inventory', 1),
(4, 'production@bakewise.com', 'password123', 'Baking Specialist', 'production', 1),
(5, 'admin@bakewise.com', 'password123', 'System Administrator', 'admin', NULL)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `branch_id` = VALUES(`branch_id`);

-- --------------------------------------------------------
-- Table structure for `bw_products`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bw_products` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `cost` DECIMAL(10,2) NOT NULL,
  `shelf_life_days` INT DEFAULT 2,
  `repurpose_recipe` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed `bw_products`
INSERT INTO `bw_products` (`id`, `name`, `category`, `price`, `cost`, `shelf_life_days`, `repurpose_recipe`) VALUES
('p1', 'Pandesal (10pcs/pack)', 'Bread', 45.00, 18.00, 2, 'Garlic Croutons or Fine Breadcrumbs'),
('p2', 'Special Ensaymada', 'Pastries', 30.00, 12.00, 3, 'Baked Ensaymada Pudding'),
('p3', 'Classic Sliced Bread', 'Bread', 65.00, 28.00, 4, 'Cinnamon Bread Pudding or French Toast Sliders'),
('p4', 'Premium Chocolate Cake', 'Cakes', 380.00, 160.00, 5, 'Chocolate Truffle Cake Pops'),
('p5', 'Spanish Bread', 'Bread', 10.00, 4.00, 2, 'Bread Pudding Base'),
('p6', 'Butter Croissant', 'Pastries', 50.00, 22.00, 2, 'Double Baked Almond Croissants')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `price` = VALUES(`price`), `cost` = VALUES(`cost`);

-- --------------------------------------------------------
-- Table structure for `bw_sales`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bw_sales` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` VARCHAR(50) NOT NULL,
  `qty` INT NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `date` DATE NOT NULL,
  `cashier` VARCHAR(255) DEFAULT 'Staff',
  `branch_id` INT DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed initial `bw_sales` sample transactions
INSERT INTO `bw_sales` (`product_id`, `qty`, `price`, `date`, `cashier`, `branch_id`) VALUES
('p1', 45, 45.00, '2026-07-12', 'Sales Staff', 1),
('p2', 28, 30.00, '2026-07-12', 'Sales Staff', 1),
('p3', 20, 65.00, '2026-07-12', 'Sales Staff', 1),
('p1', 52, 45.00, '2026-07-13', 'Sales Staff', 1),
('p2', 30, 30.00, '2026-07-13', 'Sales Staff', 1),
('p1', 60, 45.00, '2026-07-14', 'Sales Staff', 1),
('p3', 28, 65.00, '2026-07-14', 'Sales Staff', 1);

-- --------------------------------------------------------
-- Table structure for `bw_inventory`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bw_inventory` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` VARCHAR(50) NOT NULL,
  `stock_level` INT NOT NULL DEFAULT 0,
  `production_date` DATE NOT NULL,
  `expiry_date` DATE NOT NULL,
  `branch_id` INT DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed initial `bw_inventory` sample stocks
INSERT INTO `bw_inventory` (`product_id`, `stock_level`, `production_date`, `expiry_date`, `branch_id`) VALUES
('p1', 350, '2026-07-24', '2026-07-26', 1),
('p2', 15, '2026-07-15', '2026-07-18', 1),
('p3', 12, '2026-07-14', '2026-07-18', 1),
('p4', 4, '2026-07-13', '2026-07-18', 1),
('p5', 50, '2026-07-16', '2026-07-18', 1),
('p6', 8, '2026-07-17', '2026-07-19', 1);

-- --------------------------------------------------------
-- Table structure for `bw_production`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bw_production` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` VARCHAR(50) NOT NULL,
  `planned` INT NOT NULL,
  `actual` INT NOT NULL,
  `date` DATE NOT NULL,
  `baker` VARCHAR(255) DEFAULT 'Baker',
  `status` VARCHAR(50) DEFAULT 'Completed',
  `code` VARCHAR(100),
  `branch_id` INT DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed initial `bw_production` sample runs
INSERT INTO `bw_production` (`product_id`, `planned`, `actual`, `date`, `baker`, `status`, `code`, `branch_id`) VALUES
('p1', 80, 80, '2026-07-16', 'Baking Specialist', 'Completed', 'B-260717-01', 1),
('p2', 40, 40, '2026-07-16', 'Baking Specialist', 'Completed', 'B-260717-02', 1),
('p3', 25, 23, '2026-07-16', 'Baking Specialist', 'Completed', 'B-260717-03', 1),
('p6', 20, 20, '2026-07-17', 'Baking Specialist', 'Completed', 'B-260718-01', 1);

-- --------------------------------------------------------
-- Table structure for `bw_waste`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bw_waste` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` VARCHAR(50) NOT NULL,
  `qty` INT NOT NULL,
  `cost` DECIMAL(10,2) NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `date` DATE NOT NULL,
  `branch_id` INT DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed initial `bw_waste` sample incidents
INSERT INTO `bw_waste` (`product_id`, `qty`, `cost`, `reason`, `date`, `branch_id`) VALUES
('p1', 10, 18.00, 'Expired', '2026-07-13', 1),
('p2', 5, 12.00, 'Expired', '2026-07-14', 1),
('p6', 4, 22.00, 'Quality Defect', '2026-07-16', 1);
