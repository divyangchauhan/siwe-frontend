"use client";

import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { useState } from "react";
import { SiweMessage } from "siwe";

function App() {
  const account = useAccount();
  const { connectors, connect, status, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [nonce, setNonce] = useState("");
  const [signature, setSignature] = useState("");
  const [message, setMessage] = useState("");
  const [jwt, setJwt] = useState("");
  const { signMessage } = useSignMessage();

  async function getNonce(address: string | undefined) {
    if (address === undefined) {
      return null;
    }
    console.log("getNonce");
    console.log(address);
    const query = `mutation GetNonce {
        nonce(address: "${address}")
    }`;

    const { data } = await fetch("http://localhost:3000/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: query }),
    }).then((res) => res.json());

    console.log(data);
    setNonce(data.nonce);
    return data.nonce;
  }

  async function getSiweSignature(address: string, nonce: string) {
    if (address === undefined) {
      return null;
    }
    const expirationTime = new Date();
    expirationTime.setDate(expirationTime.getDate() + 14);

    const message = new SiweMessage({
      domain: window.location.host,
      address: address,
      statement: "Sign in with Ethereum to the app.",
      uri: window.location.origin,
      version: "1",
      chainId: 1,
      nonce: nonce,
      expirationTime: expirationTime.toISOString(),
    });

    const signature = signMessage(
      {
        message: message.prepareMessage(),
      },
      {
        onSuccess: (signature: string) => {
          console.log("signature");
          console.log(signature);
          console.log("message");
          console.log(message.prepareMessage());
          console.log(typeof message);
          setMessage(message.prepareMessage());
          setSignature(signature);
        },
      }
    );
  }

  async function login(message: string, signature: string) {
    console.log("trying to login");
    console.log(message);

    const query = `mutation Login {
      login(message: "${message.replace(/\n/g, "\\n")}", signature: "${signature}") 
    }
    `;

    console.log(query);

    const { data } = await fetch("http://localhost:3000/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operationName: "Login",
        variables: {},
        query: query,
      }),
    }).then((res) => res.json());

    console.log(data);
    setJwt(data.login.accessToken);
    return data;
  }

  return (
    <>
      <div>
        <h2>Account</h2>

        <div>
          status: {account.status}
          <br />
          addresses: {JSON.stringify(account.addresses)}
          <br />
          chainId: {account.chainId}
        </div>

        {account.status === "connected" && (
          <button type="button" onClick={() => disconnect()}>
            Disconnect
          </button>
        )}
      </div>

      <div>
        <h2>Connect</h2>
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            type="button"
          >
            {connector.name}
          </button>
        ))}
        <div>{status}</div>
        <div>{error?.message}</div>
      </div>
      <br />
      {account.status === "connected" && (
        <div>
          <div>Siwe</div>
          <button key={nonce} onClick={() => getNonce(account.addresses[0])}>
            Get Nonce
          </button>
          " "{nonce}
          <br />
          <div> Siwe Sign</div>
          <button onClick={() => getSiweSignature(account.addresses[0], nonce)}>
            Sign Siwe Message
          </button>
          "Signature" {signature} <br />
          "message" {message}
          <br />
          <div> Login</div>
          <button onClick={() => login(message, signature)}>
            Signin Using Siwe
          </button>
          "Jwt" {jwt}
        </div>
      )}
    </>
  );
}

export default App;
