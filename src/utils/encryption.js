const crypto = require('crypto');
const config = require('../config/config');

// Algoritmo de encriptación
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = Buffer.from(config.encryption.key, 'hex');
const IV_LENGTH = 16;

/**
 * Encripta un texto
 * @param {string} text - Texto a encriptar
 * @returns {string} Texto encriptado en formato: iv:encrypted
 */
function encrypt(text) {
  if (!text) return null;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Desencripta un texto
 * @param {string} encryptedText - Texto encriptado en formato: iv:encrypted
 * @returns {string} Texto desencriptado
 */
function decrypt(encryptedText) {
  if (!encryptedText) return null;
  
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encrypted = parts.join(':');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Genera una clave de encriptación aleatoria
 * @returns {string} Clave en formato hexadecimal
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  encrypt,
  decrypt,
  generateEncryptionKey
};
