import {timeLog} from './PCKUtils'
import {useEffect, useState} from 'react'
import './App.css';
const {ethers} = require('ethers');
const ERC20ABI = require('./abis/ERC20.json');
const ERC721ABI = require('./abis/ERC721.json');

const version = "v0.21";
const METAMASK_STATUS_NOT_CONNECTED = "metamask is not connected";
const METAMASK_STATUS_CONNECTED = "metamask is connected";
const METAMASK_STATUS_NOT_INSTALLED = "metamask is not installed";

function App() {
  const [metamaskStatus, setMetamaskStatus] = useState(METAMASK_STATUS_NOT_CONNECTED)
  const [metamaskNetworkID, setMetamaskNetworkID] = useState(0);
  const [walletAddress, setWalletAddress] = useState("n/a");
  const [walletNativeBalance, setWalletNativeBalance] = useState(0);
  const [walletERC20Symbol, setWalletERC20Symbol] = useState("n/a");
  const [walletERC20Balance, setWalletERC20Balance] = useState(0);

  function connectMetaMask() {
    timeLog(`connectMetaMask: 1.2;`);
    if (typeof window.ethereum === 'undefined') {
      setMetamaskStatus(METAMASK_STATUS_NOT_INSTALLED)
      return;
    }
    let myMetamask = window.ethereum;
    setMetamaskNetworkID(myMetamask.networkVersion);
    setWalletAddress(myMetamask.selectedAddress);
    setMetamaskStatus(METAMASK_STATUS_CONNECTED)
  }

  async function checkWalletBalances() {
    if (metamaskStatus !== METAMASK_STATUS_CONNECTED) {
      timeLog(`checkWallectBalances: ERROR - metamask is not connected`);
      return;
    }
    let myMetamask = window.ethereum;
    const provider = new ethers.providers.Web3Provider(myMetamask);
    setWalletNativeBalance(ethers.utils.formatEther(await provider.getBalance(walletAddress)));

    let tokenContract = new ethers.Contract(mapEthereumNetwork(metamaskNetworkID)[2], ERC20ABI, provider);
    setWalletERC20Symbol(await tokenContract.symbol());
    let tokenDecimalsFromContract = await tokenContract.decimals();

    let bnTokenBalance = await tokenContract.balanceOf(myMetamask.selectedAddress);
    let tokenBalance = ethers.utils.formatUnits(bnTokenBalance, tokenDecimalsFromContract);
    setWalletERC20Balance(tokenBalance);

  }

  function mapEthereumNetwork(networkID) {
    switch(networkID) {
      case "1":
        return ["Ethereum Mainnet", "ETH", "0xdAC17F958D2ee523a2206206994597C13D831ec7"];
      case "5":
        return ["Ethereum Goerli (Testnet)", "ETH", "0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60"];
      case "137":
        return ["Polygon Mainnet", "MATIC", "0x6d80113e533a2C0fe82EaBD35f1875DcEA89Ea97"];
      default:
        return [`unknown network [${networkID}]`, "???", undefined];
    }
  }

  function WalletBalances() {
    return(
      <>
        <div>
          <table className="myTable2">
            <tbody>
              <tr>
                <td><button onClick={checkWalletBalances}>check wallet balances</button></td>
                <td></td>
              </tr> 
              <tr>
                <td>native token: [{mapEthereumNetwork(metamaskNetworkID)[1]}]</td>
                <td>{walletNativeBalance}</td>
              </tr>
              <tr>
                <td>ERC-20 token: [{walletERC20Symbol}]</td>
                <td>{walletERC20Balance}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    )
  }

  return (
    <> 
      <div>
        <table className="myTable">
          <tbody>
          <tr>
            <td>my_nft_explorer</td>
            <td>{version}</td>
          </tr>          
          <tr>
            <td><button onClick={connectMetaMask}>connect/refresh metamask wallet</button></td>
            <td>{metamaskStatus}</td>
          </tr>     
          <tr>
            <td>metamask network</td>
            <td>{mapEthereumNetwork(metamaskNetworkID)[0]}</td>
          </tr>     
          <tr>
            <td>wallet address</td>
            <td>{walletAddress}</td>
          </tr>          
          </tbody>
        </table>
      </div>
      <p></p>
      <div>
        <WalletBalances />
      </div>
    </>
  );

}

export default App;
