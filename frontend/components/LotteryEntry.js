import {useWeb3Contract, useMoralis} from "react-moralis";
import {abi, contractAddresses} from "../constants";
import {useEffect, useState} from 'react';
import {ethers} from "ethers";
import  {useNotification} from "web3uikit";

export default function LotteryEntrance(){

    const [entranceFee, setEntranceFee] = useState("0");
    const [numberOfPlayers, setNumberOfPlayers] = useState("0")
    const [recentWinner, setRecentWinner] = useState("0")
    const dispatch = useNotification();
    const { chainId: chainIdHex, isWeb3Enabled } = useMoralis();
    const chainId = parseInt(chainIdHex);

    const raffleAddress = chainId in contractAddresses ? contractAddresses[chainId][0]: null;
    const { runContractFunction: enterRaffle, data: enterTxResponse,
        isLoading,
        isFetching, } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "enterRaffle",
        params: {},
        msgValue: entranceFee

    });
    const { runContractFunction: getEntranceFee } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getEntranceFee",
        params: {},

    });

    
    const { runContractFunction: getPlayersNumber } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getNumberOfPlayers",
        params: {},
    })

    const { runContractFunction: getRecentWinner } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getRecentWinner",
        params: {},
    });

    
    async function updateUIValues() {
        
        const entranceFeeFromCall = (await getEntranceFee()).toString()
        const numPlayersFromCall = (await getPlayersNumber()).toString()
        const recentWinnerFromCall = await getRecentWinner()
        setEntranceFee(entranceFeeFromCall)
        setNumberOfPlayers(numPlayersFromCall)
        setRecentWinner(recentWinnerFromCall)
    }

    useEffect(()=>{
        if(isWeb3Enabled){
         updateUIValues()
        }  
    },[isWeb3Enabled])


    const handleSuccess = async (tx)=>{ 
        await tx.wait(1)
        updateUIValues()
        handleNewNotification(tx)
    }

    const handleNewNotification = () => {
        dispatch({
            type: "info",
            message: "Transaction Complete!",
            title: "Transaction Notification",
            position: "topR",
            icon: "bell",
        })
    }

    return(
        <div className="p-5">
        <h1 className="py-4 px-4 font-bold text-3xl">Lottery</h1>
        {raffleAddress ? (
            <>
                <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-auto"
                    onClick={async () =>
                        await enterRaffle({
                            // onComplete:
                            // onError:
                            onSuccess: handleSuccess,
                            onError: (error) => console.log(error),
                        })
                    }
                    disabled={isLoading || isFetching}
                >
                    {isLoading || isFetching ? (
                        <div className="animate-spin spinner-border h-8 w-8 border-b-2 rounded-full"></div>
                    ) : (
                        "Enter Raffle"
                    )}
                </button>
                <div>Entrance Fee: {ethers.utils.formatUnits(entranceFee, "ether")} ETH</div>
                <div>The current number of players is: {numberOfPlayers}</div>
                <div>The most previous winner was: {recentWinner}</div>
            </>
        ) : (
            <div>Please connect to a supported chain </div>
        )}
    </div>
    )
}