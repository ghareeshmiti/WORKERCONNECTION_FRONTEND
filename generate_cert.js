
import selfsigned from 'selfsigned';
import fs from 'fs';

const attrs = [{ name: 'commonName', value: 'localhost' }];

async function gen() {
    try {
        console.log("Generating...");
        // Check if it's a promise or sync
        let pems = selfsigned.generate(attrs, { days: 365 });

        if (pems instanceof Promise || (pems && typeof pems.then === 'function')) {
            console.log("It is a promise using await...");
            pems = await pems;
        }

        console.log('Keys in pems object:', Object.keys(pems));

        if (pems.cert) fs.writeFileSync('cert.pem', pems.cert);
        else console.error('pems.cert is undefined');

        if (pems.private) fs.writeFileSync('key.pem', pems.private);
        else console.error('pems.private is undefined');

        console.log('Finished writing files.');
    } catch (error) {
        console.error('Error generating certs:', error);
    }
}

gen();
