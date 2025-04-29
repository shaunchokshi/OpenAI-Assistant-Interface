import bcrypt from 'bcrypt';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function generateHash() {
  try {
    const password = await new Promise(resolve => {
      rl.question('Enter password to hash: ', password => resolve(password));
    });
    
    // Generate salt and hash with bcrypt
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    
    console.log('\nBcrypt Hash:');
    console.log(hash);
    console.log('\nSQL Command:');
    console.log(`INSERT INTO users(email, password_hash) VALUES('your-email@example.com', '${hash}');`);
    console.log('\nOr update an existing user:');
    console.log(`UPDATE users SET password_hash='${hash}' WHERE email='your-email@example.com';`);
  } catch (error) {
    console.error('Error generating hash:', error);
  } finally {
    rl.close();
  }
}

generateHash();
