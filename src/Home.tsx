import { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { Button, CircularProgress, Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";

import * as anchor from "@project-serum/anchor";

import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletDialogButton } from "@solana/wallet-adapter-material-ui";

import gif from './reindeer.gif'
import WebFont from 'webfontloader';

import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  shortenAddress,
} from "./candy-machine";

const ConnectButton = styled(WalletDialogButton)``;

const CounterText = styled.span``; // add your styles here

const MintContainer = styled.div``; // add your styles here

const MintButton = styled(Button)``; // add your styles here

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

const Home = (props: HomeProps) => {
  const [balance, setBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

  const [itemsAvailable, setItemsAvailable] = useState(0);
  const [itemsRedeemed, setItemsRedeemed] = useState(0);
  const [itemsRemaining, setItemsRemaining] = useState(0);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const [startDate, setStartDate] = useState(new Date(props.startDate));

  const wallet = useAnchorWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const refreshCandyMachineState = () => {
    (async () => {
      if (!wallet) return;

      const {
        candyMachine,
        goLiveDate,
        itemsAvailable,
        itemsRemaining,
        itemsRedeemed,
      } = await getCandyMachineState(
        wallet as anchor.Wallet,
        props.candyMachineId,
        props.connection
      );

      setItemsAvailable(itemsAvailable);
      setItemsRemaining(itemsRemaining);
      setItemsRedeemed(itemsRedeemed);

      setIsSoldOut(itemsRemaining === 0);
      setStartDate(goLiveDate);
      setCandyMachine(candyMachine);
    })();
  };

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet && candyMachine?.program) {
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury
        );

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          "singleGossip",
          false
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message: "Congratulations! Mint succeeded!",
            severity: "success",
          });
        } else {
          setAlertState({
            open: true,
            message: "Mint failed! Please try again!",
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
      refreshCandyMachineState();
    }
  };

  useEffect(() => {
    (async () => {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    })();
  }, [wallet, props.connection]);

  useEffect(refreshCandyMachineState, [
    wallet,
    props.candyMachineId,
    props.connection,
  ]);

  useEffect(() => {
    WebFont.load({
      google: {
        families: ['Mochiy Pop P One, Oswald']
      }
    });
   }, []);

  return (
    <main
      style={{
        background:"#ffdf5f",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }} 
    >
                
    <div style={{
      backgroundColor: "#ffdf5f",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      height: "16.4vh"
    }}>  
      <h2 style={{
        fontFamily: "Oswald",
        background: "#ffdf5f",
        color: "black", 
        fontSize: "13vh",
        margin: 0,
        
        }}>Angry Reindeers</h2>
    </div>

    <div
      style={{
        backgroundColor: "",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        verticalAlign: "text-top",
      }}
    >
      <img src={gif} alt="" style={{
        height: "43vh",
        padding: "5vh"
      }}/>
      
      {wallet && (

      <p style={{color: "black", fontWeight: "bold", fontSize: "20px", margin: 15, marginTop: 0}}>Wallet {shortenAddress(wallet.publicKey.toBase58() || "")}</p>
      )}

      {wallet && <p style={{color: "black", fontWeight: "bold", fontSize: "20px", margin: 0}}>Balance: {(balance || 0).toLocaleString()} SOL</p>}

      {wallet && <p style={{color: "black", fontWeight: "bold", fontSize: "20px", margin: 15}}>Minted: {itemsRedeemed} / {itemsAvailable}</p>}

      <MintContainer>

      {!wallet ? (          
        <ConnectButton style={{
          fontSize: "3vh",
          background: "#C2FACD",
          fontWeight: "bold",
          color: "black",
          padding: "5px 25px",
          margin: 15,
          borderRadius: 50,
        }}>Connect Wallet</ConnectButton>
      ) : (
        <MintButton
          disabled={isSoldOut || isMinting || !isActive}
          onClick={onMint}
          variant="contained"
          style={{
            fontSize: "3vh",
            background: "#C2FACD",
            fontWeight: "bold",
            color: "black",
            padding: "5px 25px",
            margin: 30,
            borderRadius: 50
          }}
        >
          {isSoldOut ? (
            "SOLD OUT"
          ) : isActive ? (
            isMinting ? (
              <CircularProgress />
            ) : (
              "MINT"
            )
          ) : (
            <Countdown
              date={startDate}
              onMount={({ completed }) => completed && setIsActive(true)}
              onComplete={() => setIsActive(true)}
              renderer={renderCounter}
            />
          )}
        </MintButton>
      )}
      </MintContainer>

    </div>
     
      <Snackbar
        open={alertState.open}
        autoHideDuration={5000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert style={{
          fontSize: "20px",
          fontWeight: "bold",
          borderRadius: 15
        }}
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
    
    </main>
    
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <CounterText>
      {hours + (days || 0) * 24} hours, {minutes} minutes, {seconds} seconds
    </CounterText>
  );
};

export default Home;
