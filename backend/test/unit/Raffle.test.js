const { ethers, deployments, network } = require("hardhat");
const {assert, expect} = require("chai");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip:
describe("Raffle Unit Tests", function(){
     let raffle, vrfCoordinatorV2Mock, deployer, raffleEntranceFee, interval;
     const chainId = network.config.chainId;
     beforeEach(async function (){
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        raffle = await ethers.getContract("Raffle", deployer);
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
        raffleEntranceFee = await raffle.getEntranceFee();
        interval = await raffle.getInterval();
     });

     describe("constructor", function(){
        it("Initializes the raffle correcttly", async ()=>{
            const raffleState = await raffle.getRaffleState();
            assert.equal(raffleState.toString(), "0");
            assert.equal(interval.toString(), networkConfig[chainId]["interval"])
        });
     });

     describe("enterRaffle",  function(){
        it("reverts when you don't pay enough", async ()=>{
            expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__NotEnoughETHEntered");
        });

        it("records player when they enter", async()=>{
            await raffle.enterRaffle({value: raffleEntranceFee});
            const playerFromContract = await raffle.getPlayer(0);
            assert.equal(playerFromContract, deployer);
        });

        it("emits event on enter", async () =>{
            await expect(raffle.enterRaffle({value: raffleEntranceFee})).to.emit(raffle, "RaffleEnter");
        });

        it("doesn't allow entrance when raffle is calculating", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine",[] )
            await raffle.performUpkeep([]) 
            await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith("Raffle__NotOpen")
        })

     });
     describe("checkUpkeep",  () =>{
        it("returns false if people haven't sent any ETH", async ()=>{
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send( "evm_mine",[]);
            const {upKeepNeeded} = await raffle.callStatic.checkUpkeep([]);
            assert(!upKeepNeeded);
        });

        it("returns false if raffle isn't open", async ()=>{
            await raffle.enterRaffle({value: raffleEntranceFee});
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send( "evm_mine",[]);
            await raffle.performUpkeep([]);
            const raffleState = await raffle.getRaffleState();
            const {upKeepNeeded} = await raffle.callStatic.checkUpkeep([]);
            assert.equal(raffleState.toString(), "1");
            assert.equal(upKeepNeeded, false);
        });
        it("returns false if enough time hasn't passed", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() - 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            const { upKeepNeeded } = await raffle.callStatic.checkUpkeep("0x") 
            assert(!upKeepNeeded)
        })
        it("returns true if enough time has passed, has players, eth, and is open", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] });
            const { upKeepNeeded } = await raffle.callStatic.checkUpkeep("0x"); 
            assert(upKeepNeeded);
        });
     });

    describe("performUpKeep", ()=>{
        it("it can only run if checkupkeep is true", async ()=>{
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] });
            const tx = await raffle.performUpkeep([]);
            assert(tx);
        });
        
        it("reverts when checkupkeep is false", async ()=>{
            await expect(raffle.performUpkeep([])).to.be.revertedWith("Raffle__UpKeepNotNeeded");
        });

        it("updates the raffle state, emits and event", async ()=>{
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] });
            const txResponse = await raffle.performUpkeep([]);
            const txReceipt = await txResponse.wait(1);
            const requestId = txReceipt.events[1].args.requestId;
            const raffleState = await raffle.getRaffleState();
            assert(requestId.toNumber() > 0);
            assert(raffleState.toString() == "1");
        });
    });

    describe("fulfillRandomWords", function(){
        beforeEach(async ()=>{
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] });
        });

        it("can only be called after performUpKeep", async function(){
            await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)).to.be.revertedWith("nonexistent request");
            await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)).to.be.revertedWith("nonexistent request");
        });

        it("picks a winner, resets the lottery, and sends money", async function(){
            // const additionalEntrants = 3;
            // const startingAccountIndex = 1;
            // const accounts = await ethers.getSigners();
            // for(let i = startingAccountIndex; i<startingAccountIndex+additionalEntrants; i++){
            //     const accountConnectedRaffle = raffle.connect(accounts[i]);
            //     await accountConnectedRaffle.enterRaffle({value: raffleEntranceFee});
            // }

            // const startingTimeStamp = await raffle.getLastTimeStamp();
            // await new Promise(async (resolve, reject)=>{
            //     raffle.once("WinnerPicked", async ()=>{
            //         console.log("found the event")
            //         try {
            //             const recentWinner = await raffle.getRecentWinner();
            //             console.log(recentWinner);

            //             const raffleState = await raffle.getRaffleState();
            //             const endingTimeStamp = await raffle.getLastTimeStamp();
            //             const numPlayers = await raffle.getNumberOfPlayers();
            //             assert.equal(numPlayers.toString(), "0");
            //             assert.equal(raffleState.toString(), "0");
            //             assert(endingTimeStamp > startingTimeStamp);
            //             resolve(); 
            //         } catch (error) {
            //             reject(error)
            //         }
            //     });
            //     const tx = raffle.performUpkeep([]);
            //     const txReceipt = await tx.wait(1);
            //     await vrfCoordinatorV2Mock.fulfillRandomWords(
            //         txReceipt.events[1].args.requestId,
            //         raffle.address
            //     )
            // })
        const additionalEntrances = 3 // to test
        const startingIndex = 2;
        const accounts = await ethers.getSigners();
        for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) { // i = 2; i < 5; i=i+1
            const accountConnectedRaffle = raffle.connect(accounts[i]);
            await accountConnectedRaffle.enterRaffle({value: raffleEntranceFee});
        }
        const startingTimeStamp = await raffle.getLastTimeStamp() 
        await new Promise(async (resolve, reject) => {
            raffle.once("WinnerPicked", async () => {
                console.log("WinnerPicked event fired!")
                
                try {
                
                    const recentWinner = await raffle.getRecentWinner()
                    const raffleState = await raffle.getRaffleState()
                    const winnerBalance = await accounts[2].getBalance()
                    const endingTimeStamp = await raffle.getLastTimeStamp()
                    await expect(raffle.getPlayer(0)).to.be.reverted
                    assert.equal(recentWinner.toString(), accounts[2].address)
                    assert.equal(raffleState, 0)
                    assert.equal(
                        winnerBalance.toString(), 
                        startingBalance  
                            .add(
                                raffleEntranceFee
                                    .mul(additionalEntrances)
                                    .add(raffleEntranceFee)
                            )
                            .toString()
                    )
                    assert(endingTimeStamp > startingTimeStamp)
                    resolve()  
                } catch (e) { 
                    reject(e)
                }
            })
        const tx = await raffle.performUpkeep("0x")
        const txReceipt = await tx.wait(1)
        const startingBalance = await accounts[2].getBalance()
        await vrfCoordinatorV2Mock.fulfillRandomWords(
            txReceipt.events[1].args.requestId,
            raffle.address
        )
        }); 
        
        });
    });

});