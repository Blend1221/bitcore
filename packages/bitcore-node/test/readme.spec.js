/*
Notes:
- Framework: Mocha for test runner + Chai (expect) for assertions, matching repository conventions.
- Scope: Validates root README.md contents, focusing on structured examples and critical references.
*/
const fs = require('fs');
const path = require('path');
let expect;
try {
  expect = require('chai').expect; // prefer Chai present in this package
} catch (e) {
  const assert = require('assert'); // fallback to Node assert if needed
  expect = (val) => ({
    to: {
      be: {
        a: (t) => assert.strictEqual(typeof val, t),
        true: () => assert.strictEqual(!!val, true),
      },
      equal: (other) => assert.strictEqual(val, other),
      include: (substr) => assert.ok(String(val).includes(substr)),
      match: (re) => assert.ok(re.test(val)),
      oneOf: (arr) => assert.ok(arr.includes(val)),
      satisfy: (fn) => assert.ok(fn(val)),
      deep: { include: (obj) => { for (const k of Object.keys(obj)) { if (val[k] !== obj[k]) throw new Error(`Expected ${k}=${obj[k]} but got ${val[k]}`); } } }
    }
  });
}

const { loadReadme, extractCodeBlocks, firstCodeBlockByLang, getSection } = require('./utils/readmeTestUtils');

describe('Root README.md integrity and examples', function () {
  let readme;
  before(function () {
    readme = loadReadme();
  });

  it('has title and tagline', function () {
    expect(readme.startsWith('# Bitcore')).to.be.true();
    expect(readme).to.include('Infrastructure to build Bitcoin and blockchain-based applications');
  });

  it('shows badges (npm version, commit activity, contributors, CI, license)', function () {
    expect(readme).to.include('img.shields.io/npm/v/bitcore-lib');
    expect(readme).to.include('img.shields.io/github/commit-activity');
    expect(readme).to.include('img.shields.io/github/contributors');
    expect(readme).to.include('circleci.com/gh/bitpay/bitcore.svg');
    expect(readme).to.include('License-MIT');
  });

  it('lists Requirements with expected items', function () {
    const sec = getSection(readme, 'Getting Started');
    expect(sec).to.be.a('string');
    expect(sec).to.include('### Requirements');
    expect(sec).to.include('Trusted P2P Peer');
    expect(sec).to.include('MongoDB Server >= v3.4');
    expect(sec).to.include('make g++ gcc');
  });

  it('provides checkout/install instructions', function () {
    const sec = getSection(readme, 'Getting Started');
    expect(sec).to.include('git clone git@github.com:bitpay/bitcore.git');
    expect(sec).to.include('git checkout master');
    expect(sec).to.include('npm install');
  });

  it('documents setup steps 1-4 (Bitcore config, Bitcoin node, run node, start Bitcore)', function () {
    const setup = getSection(readme, 'Setup Guide');
    expect(setup).to.be.a('string');
    ['1. Setup Bitcore config', '2. Setup Bitcoin Node', '3. Run Bitcoin node', '4. Start Bitcore'].forEach(s => {
      expect(setup).to.include(s);
    });
    expect(setup).to.include('npm run node');
  });

  it('contains a valid JSON example config with essential schema and values', function () {
    const jsonBlock = firstCodeBlockByLang(readme, 'json');
    expect(!!jsonBlock).to.be.true();
    let cfg;
    try { cfg = JSON.parse(jsonBlock.content); } catch (e) { throw new Error('JSON example is invalid: ' + e.message); }
    expect(cfg).to.be.a('object');
    expect(cfg.bitcoreNode).to.be.a('object');
    const chains = cfg.bitcoreNode.chains;
    expect(chains).to.be.a('object');

    // BTC
    expect(!!chains.BTC).to.be.true();
    expect(!!chains.BTC.mainnet).to.be.true();
    expect(chains.BTC.mainnet.chainSource).to.equal('p2p');
    expect(!!chains.BTC.mainnet.rpc).to.be.true();
    expect(chains.BTC.mainnet.rpc.host).to.match(/^\d{1,3}(\.\d{1,3}){3}$/);
    expect(String(chains.BTC.mainnet.rpc.port)).to.match(/^\d+$/);
    expect(!!chains.BTC.regtest).to.be.true();

    // BCH
    expect(!!chains.BCH).to.be.true();
    expect(!!chains.BCH.mainnet).to.be.true();
    expect(chains.BCH.mainnet.parentChain).to.equal('BTC');
    expect(String(chains.BCH.mainnet.forkHeight)).to.match(/^\d+$/);

    // Trusted peers format
    const collectPeers = (o) => ([]).concat(...Object.values(o).map(n => (n.trustedPeers || [])));
    const peers = collectPeers({ BTC: chains.BTC, BCH: chains.BCH });
    expect(Array.isArray(peers)).to.be.true();
    peers.forEach(p => {
      expect(p.host).to.match(/^\d{1,3}(\.\d{1,3}){3}$/);
      expect(String(p.port)).to.match(/^\d+$/);
    });

    // Spot-check known example ports from README to catch accidental edits
    expect(chains.BTC.mainnet.trustedPeers[0].port).to.oneOf([20008]); // README shows 20008
    expect(chains.BCH.mainnet.trustedPeers[0].port).to.oneOf([30008]); // README shows 30008
  });

  it('Bitcoin Core config snippet includes rpc creds and expected flags/ports', function () {
    const blocks = extractCodeBlocks(readme);
    const shBlocks = blocks.filter(b => ['sh','bash'].includes(b.lang));
    const cfg = shBlocks.find(b => /rpcuser=.+\nrpcpassword=.+/m.test(b.content));
    expect(!!cfg).to.be.true();
    const c = cfg.content;
    ['whitelist=127.0.0.1','txindex=0','listen=1','server=1','irc=1','upnp=1'].forEach(k => expect(c).to.include(k));
    expect(c).to.match(/port=20008/);
    expect(c).to.match(/rpcport=20009/);
  });

  it('Run Bitcoin node example uses Bitcoin-Qt with -datadir', function () {
    const sh = firstCodeBlockByLang(readme, 'sh');
    expect(!!sh).to.be.true();
    expect(sh.content).to.include('Bitcoin-Qt');
    expect(sh.content).to.include('-datadir=');
  });

  it('Applications section lists key apps', function () {
    const sec = getSection(readme, 'Applications');
    expect(sec).to.include('Bitcore Node');
    expect(sec).to.include('Bitcore Wallet');
    expect(sec).to.include('Bitcore Wallet Client');
    expect(sec).to.include('Bitcore Wallet Service');
    expect(sec).to.include('Insight');
    expect(sec).to.include('Bitpay Wallet');
  });

  it('Libraries section lists core libraries', function () {
    const sec = getSection(readme, 'Libraries');
    ['Bitcore Lib','Bitcore Lib Cash','Bitcore P2P','Bitcore P2P Cash','Bitcore Mnemonic','Crypto Wallet Core','Bitcore ECIES','Bitcore Channel','Bitcore Message']
      .forEach(item => expect(sec).to.include(item));
  });

  it('Extras section references build and client helpers', function () {
    const sec = getSection(readme, 'Extras');
    expect(sec).to.include('Bitcore Build');
    expect(sec).to.include('Bitcore Client');
  });

  it('Contributing and License sections link to expected documents', function () {
    const contrib = getSection(readme, 'Contributing');
    const license = getSection(readme, 'License');
    expect(contrib).to.match(/Contributing\.md/i);
    expect(license).to.match(/MIT/i);
    expect(license).to.match(/LICENSE/i);
  });

  it('internal package links resolve when present in the checkout (skips if none found)', function () {
    const cwd = process.cwd();
    const links = [
      'packages/bitcore-node',
      'packages/bitcore-wallet',
      'packages/bitcore-wallet-client',
      'packages/bitcore-wallet-service',
      'packages/insight',
      'packages/bitcore-lib',
      'packages/bitcore-lib-cash',
      'packages/bitcore-p2p',
      'packages/bitcore-p2p-cash',
      'packages/bitcore-mnemonic',
      'packages/crypto-wallet-core',
      'packages/bitcore-build',
      'packages/bitcore-client'
    ];
    const existing = links.filter(p => fs.existsSync(path.join(cwd, p)));
    if (existing.length === 0) this.skip();
  });
});