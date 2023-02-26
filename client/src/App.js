import {timeLog} from './PCKUtils'
import {useEffect, useState} from 'react'
import './App.css';
const {ethers} = require('ethers');
const ERC20ABI = require('./abis/ERC20.json');
const ERC721ABI = require('./abis/ERC721.json');
const {abi:ERC1155ABI} = require('./abis/ERC1155.json');

const version = "v0.24";
const METAMASK_STATUS_NOT_CONNECTED = "metamask is not connected";
const METAMASK_STATUS_CONNECTED = "metamask is connected";
const METAMASK_STATUS_NOT_INSTALLED = "metamask is not installed";

const NFT_INTERFACE_ERC1155 = "NFT_INTERFACE_ERC1155";
const NFT_INTERFACE_ERC721 = "NFT_INTERFACE_ERC721";
const NFT_INTERFACE_UNKNOWN = "NFT_INTERFACE_UNKNOWN";

const ERC165Abi = [
  {
    inputs: [
      {
        internalType: "bytes4",
        name: "interfaceId",
        type: "bytes4",
      },
    ],
    name: "supportsInterface",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const ERC1155InterfaceId = "0xd9b67a26";
const ERC721InterfaceId = "0x80ac58cd";

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

function WalletBalances(props) {
  const [walletAddress, setWalletAddress] = useState("n/a");
  const [walletNativeBalance, setWalletNativeBalance] = useState(0);
  const [walletERC20Symbol, setWalletERC20Symbol] = useState("n/a");
  const [walletERC20Balance, setWalletERC20Balance] = useState(0);
  const [nftContractAddress, setNFTContractAddress] = useState("");
  const [nftSymbol, setNFTSymbol] = useState("n/a");
  const [nftID, setNFTID] = useState("");
  const [nftOwnerAddress, setNFTOwnerAddress] = useState("n/a");
  const [nftDescription, setNftDescription] = useState("n/a");
  const [nftTokenURI, setNFTTokenURI] = useState(undefined);
  const [nftImageURI, setNFTImageURI] = useState(undefined);
  const [erc1155BalanceOf, setErc1155BalanceOf] = useState(0);

  useEffect(() => {
    if (props.metamask) {
      setWalletAddress(props.metamask.selectedAddress);
    }
  }, [props.metamask])

  async function checkWalletBalances() {
    if (props.metamask === undefined) {
      timeLog(`WalletBalances.checkWallectBalances: ERROR - metamask is not connected`);
      return;
    }
    timeLog(`WalletBalances.checkWalletBalances: walletAddress:${walletAddress};`)
    const web3Provider = new ethers.providers.Web3Provider(props.metamask);
    try {
      setWalletNativeBalance(ethers.utils.formatEther(await web3Provider.getBalance(walletAddress)));

      let tokenContract = new ethers.Contract(mapEthereumNetwork(props.metamask.networkVersion)[2], ERC20ABI, web3Provider);
      setWalletERC20Symbol(await tokenContract.symbol());
      let tokenDecimalsFromContract = await tokenContract.decimals();

      let bnTokenBalance = await tokenContract.balanceOf(walletAddress);
      let tokenBalance = ethers.utils.formatUnits(bnTokenBalance, tokenDecimalsFromContract);
      setWalletERC20Balance(tokenBalance);
    } catch (ex) {
      timeLog(`WalletBalances.checkWalletBalances: ERROR - ${ex};`);
    }
  }

  function handleWalletAddressChange(event) {
    timeLog(`WalletBalances.handleInputWalletAddressChange: event.target.value:${event.target.value};`);
    setWalletAddress(event.target.value);
  }

  function handleNFTContractAddressChange(event) {
    timeLog(`WalletBalances.handleNFTContractAddressChange: event.target.value:${event.target.value};`);
    setNFTContractAddress(event.target.value);
  }

  function handleNFTIDChange(event) {
    timeLog(`WalletBalances.handleNFTIDChange: event.target.value:${event.target.value};`);
    setNFTID(event.target.value);
  }

  async function checkNFTInterface(contractAddress) {
    timeLog(`checkNFTInterface: 1.0; contractAddress:${contractAddress};`);
    let erc165Contract = new ethers.Contract(contractAddress, ERC165Abi, new ethers.providers.Web3Provider(props.metamask));
    let address = erc165Contract.address;
    timeLog(`__address:${address};`);
    try {
      let isERC721 = await erc165Contract.supportsInterface(ERC721InterfaceId);
      timeLog(`checkNFTInterface: isERC721:${isERC721};`);

      let isERC1155 = await erc165Contract.supportsInterface(ERC1155InterfaceId);
      timeLog(`checkNFTInterface: isERC1155:${isERC1155};`);
    
      if (isERC1155) {
        return NFT_INTERFACE_ERC1155;
      }
      if (isERC721) {
        return NFT_INTERFACE_ERC721;
      }
    } catch (ex) {
      timeLog(`checkNFTInterface: ERROR - ${ex};`);
      return NFT_INTERFACE_UNKNOWN;
    }
    return NFT_INTERFACE_UNKNOWN;
  }

  async function checkNFT() {
    if (props.metamask === undefined) {
      timeLog(`WalletBalances.checkNFT: ERROR - metamask is not connected`);
      return;
    }
    const nftType = await checkNFTInterface(nftContractAddress);
    const web3Provider = new ethers.providers.Web3Provider(props.metamask);

    try {
      if (nftType === NFT_INTERFACE_ERC1155) {
        let nftERC1155Contract = new ethers.Contract(nftContractAddress, ERC1155ABI, web3Provider);
        let thisNftBalance = ethers.utils.formatUnits(await nftERC1155Contract.balanceOf(walletAddress, nftID), 0);
        setErc1155BalanceOf(thisNftBalance);
        setNFTTokenURI(await nftERC1155Contract.uri(nftID));
      } else if (nftType === NFT_INTERFACE_ERC721) {
        let nftERC721Contract = new ethers.Contract(nftContractAddress, ERC721ABI, web3Provider);
        setNFTSymbol(await nftERC721Contract.symbol());
        let ownerOfThisNFT = await nftERC721Contract.ownerOf(nftID);
        setNFTOwnerAddress(ownerOfThisNFT);
        setNFTTokenURI(await nftERC721Contract.tokenURI(nftID));
      } else {
        // for now, default to ERC-721
        timeLog(`WalletBalances.checkNFT: nftType is unknown [${nftType}], skipping further checks...`);
        /*
        let nftERC721Contract = new ethers.Contract(nftContractAddress, ERC721ABI, web3Provider);
        setNFTSymbol(await nftERC721Contract.symbol());
        let ownerOfThisNFT = await nftERC721Contract.ownerOf(nftID);
        setNFTOwnerAddress(ownerOfThisNFT);
        setNFTTokenURI(await nftERC721Contract.tokenURI(nftID));
        */
      }
    } catch (ex) {
      timeLog(`WalletBalances.checkNFT: ERROR - ${ex};`);
    }
  }

  async function displayNFT() {
    if (props.metamask === undefined) {
      timeLog(`WalletBalances.displayNFT: ERROR - metamask is not connected`);
      return;
    }
    if (nftTokenURI === undefined) {
      timeLog(`WalletBalances.displayNFT: ERROR - nftTokenURI is undefined`);
      return;
    }
    timeLog(`WalletBalances.displayNFT: nftTokenURI: ${nftTokenURI};`);
    let finalNFTTokenURI = nftTokenURI;
    if (nftTokenURI.substring(0,4) == "ipfs") {
      /* 
        convert:
        ipfs://QmcNjnPtCaEmG5kVvtxYFx1gY6FNDw8N12ciw95Yem5Hc8
        to:
        https://ipfs.io/ipfs/QmcNjnPtCaEmG5kVvtxYFx1gY6FNDw8N12ciw95Yem5Hc8
      */
      let nftTokenURIRest = nftTokenURI.substring(7);
      timeLog(`__nftTokenURIRest:${nftTokenURIRest};`);
      finalNFTTokenURI = `https://ipfs.io/ipfs/${nftTokenURIRest}`;
    }
    timeLog(`WalletBalances.displayNFT: finalNFTTokenURI:${finalNFTTokenURI}`);
    try {
      const response = await fetch(finalNFTTokenURI);
      const data = await response.json();
      if (data.description) {
        setNftDescription(data.description);
      }
      const imageURI = data.image;
      timeLog(`WalletBalances.displayNFT: imageURI:${imageURI};`);
      let finalImageURI = imageURI;
      if (imageURI.substring(0,4) == "ipfs") {
        let imageURIRest = imageURI.substring(7);
        finalImageURI = `https://ipfs.io/ipfs/${imageURIRest}`;
      }
      setNFTImageURI(finalImageURI);
    } catch (ex) {

    }
    /*
    if (i.substring(0,4) == "ipfs") {

    }
    const response = await fetch(i);
    const data = await response.json();
    //timeLog(`__data:${JSON.stringify(data)};`);
    const imageURI = data.image;
    timeLog(`image:${imageURI};`);
    setFetchedImage(imageURI);
    */
  }

  return(
    <>
      <div>
        <table className="myTable2">
          <tbody>
            <tr>
              <td><button onClick={checkWalletBalances}>check wallet balances</button></td>
              <td><input type="text" size="50" id="walletAddress" name="walletAddress" onChange={handleWalletAddressChange} value={walletAddress} /></td>
            </tr> 
            <tr>
              <td>native token: [{props.metamask ? mapEthereumNetwork(props.metamask.networkVersion)[1] : "n/a - 2"}]</td>
              <td>{walletNativeBalance}</td>
            </tr>
            <tr>
              <td>ERC-20 token: [{walletERC20Symbol}]</td>
              <td>{walletERC20Balance}</td>
            </tr>
            <tr>
              <td>NFT Contract Address</td>
              <td><input type="text" size="50" id="nftContractAddress" name="nftContractAddress" onChange={handleNFTContractAddressChange} value={nftContractAddress} /></td>
            </tr>
            <tr>
              <td>NFT ID that you owned</td>
              <td><input type="text" size="50" id="nftID" name="nftID" onChange={handleNFTIDChange} value={nftID} /></td>
            </tr>
            <tr>
              <td><button onClick={checkNFT}>check this NFT</button></td>
              <td></td>
            </tr>
            <tr>
              <td>NFT Symbol</td>
              <td>{nftSymbol}</td>
            </tr>
            <tr>
              <td>NFT owner address</td>
              <td>{nftOwnerAddress}</td>
            </tr>
            <tr>
              <td>ERC1155 - balanceOf</td>
              <td>{erc1155BalanceOf}</td>
            </tr>            
            <tr>
              <td>Are you the owner of this NFT?</td>
              <td>n/a - 4</td>
            </tr>
            <tr>
              <td>display this NFT metadata</td>
              <td><button onClick={displayNFT}>display</button></td>
            </tr>
            <tr>
              <td>NFT Description</td>
              <td>{nftDescription}</td>
            </tr>
          </tbody>
        </table>
        <div><img src={nftImageURI} alt="the image" width="400"  height="500"/></div>
      </div>
    </>
  )
}

function App() {
  const [metamaskStatus, setMetamaskStatus] = useState(METAMASK_STATUS_NOT_CONNECTED);
  const [metamask, setMetamask] = useState({
                                            networkVersion: "n/a - 3",
                                            selectedAddress: "n/a - 3",
                                          });
  //const [web3Provider, setWeb3Provider] = useState(undefined);
  //const [metamaskNetworkID, setMetamaskNetworkID] = useState(0);
  //const [walletAddress, setWalletAddress] = useState("n/a");

  function connectMetaMask() {
    timeLog(`App.connectMetaMask: 1.2;`);
    if (typeof window.ethereum === 'undefined') {
      setMetamaskStatus(METAMASK_STATUS_NOT_INSTALLED);
      return;
    }
    //let myMetamask = window.ethereum;
    //setMetamaskNetworkID(myMetamask.networkVersion);
    window.ethereum.request({ method: 'eth_requestAccounts' });
    let newMetamask = {...window.ethereum};
    if (metamask === undefined) {
      timeLog(`App.connectMetaMask: metamask network updated from [undefined] to [${newMetamask.networkVersion}];`);
    } else {
      timeLog(`App.connectMetaMask: metamask network updated from [${metamask.networkVersion}] to [${newMetamask.networkVersion}];`);
    }
    setMetamask(newMetamask);
    //setWalletAddress(myMetamask.selectedAddress);
    setMetamaskStatus(METAMASK_STATUS_CONNECTED);
    //setWeb3Provider(new ethers.providers.Web3Provider(myMetamask));
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
            <td>connected network</td>
            <td>{mapEthereumNetwork(metamask.networkVersion)[0]}</td>
          </tr>     
          <tr>
            <td>connected wallet address</td>
            <td>{metamask.selectedAddress}</td>
          </tr>          
          </tbody>
        </table>
      </div>
      <p></p>
      <div>
        <WalletBalances 
          metamask={metamask}
        />
      </div>
    </>
  );

}

export default App;
