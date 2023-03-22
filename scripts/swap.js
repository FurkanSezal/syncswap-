const { ethers } = require("ethers");
const { Provider, zksync, Wallet } = require("zksync-web3");
const { VaultAbi } = require("../abis/VaultAbi");
const { PoolAbi } = require("../abis/PoolAbi");
const { RouterAbi } = require("../abis/RouterAbi");
const { factoryAbi } = require("../abis/PoolFactory");

const ercAbi = [
  // Read-Only Functions
  "function balanceOf(address owner) view returns (uint256)",
  // Authenticated Functions
  "function transfer(address to, uint amount) returns (bool)",
  "function deposit() public payable",
  "function approve(address spender, uint256 amount) returns (bool)",
];

const WETH_ADDRESS = "0x20b28B1e4665FFf290650586ad76E977EAb90c5D";
const DAI_ADDRESS = "0x3e7676937A7E96CFB7616f255b9AD9FF47363D4b";
const DAI_DECIMALS = 18;
const POOL_ADDRESS = "0xe52940eDDa6ec5FDabef7C33B9C1E1d613BbA144"; // ETH/DAI
const VAULT_CONTRACT_ADDRESS = "0x4Ff94F499E1E69D687f3C3cE2CE93E717a0769F8";
const ROUTER_ADDRESS = "0xB3b7fCbb8Db37bC6f572634299A58f51622A847e";
const POOLFACTORY_ADDRESS = "0xf2FD2bc2fBC12842aAb6FbB8b1159a6a83E72006"; // Classic
const ADDRESS_ZERO = ethers.constants.AddressZero;
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL;

async function main() {
  const provider = new Provider("https://zksync2-testnet.zksync.dev");
  const ethProvider = ethers.getDefaultProvider(GOERLI_RPC_URL);
  const PRIVATE_KEY = process.env.PRIVATE_KEY;

  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  // Initialise contract instance
  const WETH = new ethers.Contract(WETH_ADDRESS, ercAbi, signer);
  const DAI = new ethers.Contract(DAI_ADDRESS, ercAbi, signer);
  const Vault = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VaultAbi, signer);
  const Pool = new ethers.Contract(POOL_ADDRESS, PoolAbi, signer);
  const Router = new ethers.Contract(ROUTER_ADDRESS, RouterAbi, signer);

  const PoolFactory = new ethers.Contract(
    POOLFACTORY_ADDRESS,
    factoryAbi,
    signer
  );

  // `(address _tokenIn, address _to, uint8 _withdrawMode) = abi.decode(_data, (address, address, uint8));`
  // function swap(bytes calldata data) external returns (uint amountOut);

  const value = ethers.utils.parseEther("0.000001");

  // Constructs the swap paths with steps.
  // Determine withdraw mode, to withdraw native ETH or wETH on last step.
  // 0 - vault internal transfer
  // 1 - withdraw and unwrap to naitve ETH
  // 2 - withdraw and wrap to wETH
  const withdrawMode = 2; // 1 or 2 to withdraw to user's wallet

  const swapData = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "uint8"],
    [WETH_ADDRESS, signer.address, withdrawMode] // tokenIn, to, withdraw mode
  );
  const steps = [
    {
      pool: POOL_ADDRESS,
      data: swapData,
      callback: ADDRESS_ZERO, // we don't have a callback
      callbackData: "0x",
    },
  ];
  const nativeETHAddress = ADDRESS_ZERO;
  const paths = [
    {
      steps: steps,
      tokenIn: nativeETHAddress,
      amountIn: value,
    },
  ];

  // If we want to use the native ETH as the input token,
  // the `tokenIn` on path should be replaced with the zero address.
  // Note: however we still have to encode the wETH address to pool's swap data.

  await checkBalances();
  // Note: checks approval for ERC20 tokens.
  // The router will handle the deposit to the pool's vault account.
  const approve = await WETH.approve(Router.address, value);
  await approve.wait();

  const response = await Router.swap(
    paths, // paths
    0, // amountOutMin // Note: ensures slippage here
    Math.floor(Date.now() / 1000) + 60 * 10, // deadline // 10 minutes
    {
      value: value,
    }
  );

  tx_receipt = await response.wait();

  console.log("receipt: ", tx_receipt);

  await checkBalances();
  /*  const deposit = await WETH.deposit({
    value: ethers.utils.parseEther("0.00001"),
  });
  await deposit.wait();
  console.log("After deposited!"); */
  /*  const depositEth = await Vault.depositETH(signer, {
    value: ethers.utils.parseEther("0.00001"),
  });
  await checkBalances(); */
  // console.log((await Vault.reserves(ethers.constants.AddressZero)).toString());

  async function checkBalances() {
    const expandedWETHBalanceBefore = await WETH.balanceOf(signer.address);
    const expandedDAIBalanceBefore = await DAI.balanceOf(signer.address);
    const DAIBalanceBefore = Number(
      ethers.utils.formatUnits(expandedDAIBalanceBefore, DAI_DECIMALS)
    );
    const WETHBalanceBefore = Number(
      ethers.utils.formatUnits(expandedWETHBalanceBefore, DAI_DECIMALS)
    );
    console.log("DAIBalance: ", DAIBalanceBefore);
    console.log("WETHBalance: ", WETHBalanceBefore);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
