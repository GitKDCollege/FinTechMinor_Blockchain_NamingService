import React, { useEffect, useState } from "react";
import './styles/App.css';
import {ethers} from "ethers";
import contractAbi from './utils/contractABI.json';
import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';
import { networks } from './utils/networks';

// Constants
// Add the domain you will be minting
const tld = '.bmw';
// const CONTRACT_ADDRESS = '0xe99704ba694B499F2b24b51114E453f1C77bCf18'; - Older Version
const CONTRACT_ADDRESS = "0x61B743c24e586c0873Ef431fE389F7F13ef799Ea";

const App = () => {
	const [currentAccount, setCurrentAccount] = useState('');
	// Add some state data propertie
	const [domain, setDomain] = useState('');
	const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState('');
  const [network, setNetwork] = useState('');
  const [editing, setEditing] = useState(false);

  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert("Get MetaMask -> https://metamask.io/");
        return;
      }
			
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      
      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error)
    }
  }

	const checkIfWalletIsConnected = async () => {
		const { ethereum } = window;

		if (!ethereum) {
			console.log('Make sure you have metamask!');
			return;
		} else {
			console.log('We have the ethereum object', ethereum);
		}

		const accounts = await ethereum.request({ method: 'eth_accounts' });

		if (accounts.length !== 0) {
			const account = accounts[0];
			console.log('Found an authorized account:', account);
			setCurrentAccount(account);
		} else {
			console.log('No authorized account found');
		}

		// This is the new part, we check the user's network chain ID
		const chainId = await ethereum.request({ method: 'eth_chainId' });
		setNetwork(networks[chainId]);
	
		ethereum.on('chainChanged', handleChainChanged);
		
		// Reload the page when they change networks
		function handleChainChanged(_chainId) {
		  window.location.reload();
		}
	}

	const switchNetwork = async () => {
		if (window.ethereum) {
		  try {
			// Try to switch to the Mumbai testnet
			await window.ethereum.request({
			  method: 'wallet_switchEthereumChain',
			  params: [{ chainId: '0x13881' }], // Check networks.js for hexadecimal network ids
			});
		  } catch (error) {
			// This error code means that the chain we want has not been added to MetaMask
			// In this case we ask the user to add it to their MetaMask
			if (error.code === 4902) {
			  try {
				await window.ethereum.request({
				  method: 'wallet_addEthereumChain',
				  params: [
					{	
					  chainId: '0x13881',
					  chainName: 'Polygon Mumbai Testnet',
					  rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
					  nativeCurrency: {
						  name: "Mumbai Matic",
						  symbol: "MATIC",
						  decimals: 18
					  },
					  blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
					},
				  ],
				});
			  } catch (error) {
				console.log(error);
			  }
			}
			console.log(error);
		  }
		} else {
		  // If window.ethereum is not found then MetaMask is not installed
		  alert('MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html');
		} 
	  }

		const mintDomain = async () => {
			// Don't run if the domain is empty
  if (!domain) { return }
  // Alert the user if the domain is too short
  if (domain.length < 3) {
    alert('Domain must be at least 3 characters long');
    return;
  }
  // Calculate price based on length of domain (change this to match your contract)	
  // 3 chars = 0.5 MATIC, 4 chars = 0.3 MATIC, 5 or more = 0.1 MATIC
  const price = domain.length === 3 ? '0.5' : domain.length === 4 ? '0.3' : '0.1';
  console.log("Minting domain", domain, "with price", price);
  try {
      const { ethereum } = window;
      if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

      console.log("Going to pop wallet now to pay gas...")
          let tx = await contract.register(domain, {value: ethers.utils.parseEther(price)});
          // Wait for the transaction to be mined
      const receipt = await tx.wait();

      // Check if the transaction was successfully completed
      if (receipt.status === 1) {
        console.log("Domain minted! https://mumbai.polygonscan.com/tx/"+tx.hash);
        
        // Set the record for the domain
        tx = await contract.setRecord(domain, record);
        await tx.wait();

        console.log("Record set! https://mumbai.polygonscan.com/tx/"+tx.hash);
        
        // Call fetchMints after 2 seconds
        setTimeout(() => {
          fetchMints();
        }, 2000);

        setRecord('');
        setDomain('');
      } else {
        alert("Transaction failed! Please try again");
      }
      }
    } catch(error) {
      console.log(error);
    }
	}

		// Add a stateful array at the top next to all the other useState calls
const [mints, setMints] = useState([]);

// Add this function anywhere in your component (maybe after the mint function)
const fetchMints = async () => {
  try {
    const { ethereum } = window;
    if (ethereum) {
      // You know all this
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);
        
      // Get all the domain names from our contract
      const names = await contract.getAllNames();
        
      // For each name, get the record and the address
      const mintRecords = await Promise.all(names.map(async (name) => {
      const mintRecord = await contract.records(name);
      const owner = await contract.domains(name);
      return {
        id: names.indexOf(name),
        name: name,
        record: mintRecord,
        owner: owner,
      };
    }));

    console.log("MINTS FETCHED ", mintRecords);
    setMints(mintRecords);
    }
  } catch(error){
    console.log(error);
  }
}

// Add this render function next to your other render functions
const renderMints = () => {
	if (currentAccount && mints.length > 0) {
	  return (
		<div className="mint-container">
		  <p className="subtitle"> Recently minted domains!</p>
		  <div className="mint-list">
			{ mints.map((mint, index) => {
			  return (
				<div className="mint-item" key={index}>
				  <div className='mint-row'>
					<a className="link" href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`} target="_blank" rel="noopener noreferrer">
					  <p className="underlined">{' '}{mint.name}{tld}{' '}</p>
					</a>
					{/* If mint.owner is currentAccount, add an "edit" button*/}
					{ mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
					  <button className="edit-button" onClick={() => editRecord(mint.name)}>
						<img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
					  </button>
					  :
					  null
					}
				  </div>
			<p> {mint.record} </p>
		  </div>)
		  })}
		</div>
	  </div>);
	}
  };

// This will run any time currentAccount or network are changed
useEffect(() => {
  if (network === 'Polygon Mumbai Testnet') {
    fetchMints();
  }
}, [currentAccount, network]);

		const updateDomain = async () => {
			if (!record || !domain) { return }
			setLoading(true);
			console.log("Updating domain", domain, "with record", record);
			  try {
			  const { ethereum } = window;
			  if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);
		  
				let tx = await contract.setRecord(domain, record);
				await tx.wait();
				console.log("Record set https://mumbai.polygonscan.com/tx/"+tx.hash);
		  
				fetchMints();
				setRecord('');
				setDomain('');
			  }
			  } catch(error) {
				console.log(error);
			  }
			setLoading(false);
		  }
	

	// Render methods
	const renderNotConnectedContainer = () => (
		<div className="connect-wallet-container">
			<img src="https://media.giphy.com/media/KbAbh6CbK4r5dyaZ4i/giphy.gif" alt="Spice" />
      {/* Call the connectWallet function we just wrote when the button is clicked */}
			<button onClick={connectWallet} className="cta-button connect-wallet-button">
				Connect Wallet
			</button>
		</div>
	);

	
	// This will take us into edit mode and show us the edit buttons!
	const editRecord = (name) => {
		console.log("Editing record for", name);
		setEditing(true);
		setDomain(name);
	}
	
	// Form to enter domain name and data
	const renderInputForm = () =>{
		if (network !== 'Polygon Mumbai Testnet') {
			return (
				<div className="connect-wallet-container">
			  <p>Please connect to Polygon Mumbai Testnet</p>
			  <button className='cta-button mint-button' onClick={switchNetwork}>Click here to switch</button>
			</div>
		  );
		}
		
	

		return (
		  <div className="form-container">
			<div className="first-row">
			  <input
				type="text"
				value={domain}
				placeholder='domain'
				onChange={e => setDomain(e.target.value)}
			  />
			  <p className='tld'> {tld} </p>
			</div>
	
			<input
			  type="text"
			  value={record}
			  placeholder='What is your Power?'
			  onChange={e => setRecord(e.target.value)}
			/>
			  {/* If the editing variable is true, return the "Set record" and "Cancel" button */}
			  {editing ? (
				<div className="button-container">
				  {/* This will call the updateDomain function we just made */}
				  <button className='cta-button mint-button' disabled={loading} onClick={updateDomain}>
					Set record
				  </button>  
				  {/* This will let us get out of editing mode by setting editing to false */}
				  <button className='cta-button mint-button' onClick={() => {setEditing(false)}}>
					Cancel
				  </button>  
				</div>
			  ) : (
				// If editing is not true, the mint button will be returned instead
				<button className='cta-button mint-button' disabled={loading} onClick={mintDomain}>
				  Mint
				</button>  
			  )}
		  </div>
		);
	  }
  
	useEffect(() => {
		checkIfWalletIsConnected();
	}, []);

	return (
		<div className="App">
			<div className="container">
			<div className="header-container">
  <header>
    <div className="left">
      <p className="title">Name Service by Team 'SPICE'</p>
      <p className="subtitle">Team Spice : Prabhas, Meghan, Kishor, Preetish, Rachana, Dharshan</p>
    </div>
    {/* Display a logo and wallet connection status*/}
    <div className="right">
      <img alt="Network logo" className="logo" src={ network.includes("Polygon") ? polygonLogo : ethLogo} />
      { currentAccount ? <p> Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} </p> : <p> Not connected </p> }
    </div>
  </header>
</div>
				
				{!currentAccount && renderNotConnectedContainer()}
				{/* Render the input form if an account is connected */}
				{currentAccount && renderInputForm()}
				{mints && renderMints()}
				
				<div className="footer-container">
				</div>
			</div>
		</div>
	);
};

export default App;