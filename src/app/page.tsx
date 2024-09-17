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
  const [presignedUrl, setPresignedUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(Object);
  const [fileHash, setfileHash] = useState("");
  const [fileType, setFileType] = useState("");
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

  const getPresignedUrl = async () => {
    if (!selectedFile) {
      alert("Please select a file to get a presigned URL first.");
      return;
    }

    const query = `mutation createUploadUrl {
      createUploadUrl(filename: "${selectedFile.name}", appname: KlerosCourt, fileType: "${fileType}", fileHash: "${fileHash}")
    }
    `;

    const { data } = await fetch("http://localhost:3000/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        operationName: "createUploadUrl",
        variables: {},
        query: query,
      }),
    }).then((res) => res.json());
    setPresignedUrl(data.getPresignedUrl);
  };

  const handleFileSelect = (event: any) => {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        setfileHash(hashHex);
        const fileType = file.type;
        setFileType(fileType);
      };
      reader.readAsArrayBuffer(file);
    }
    setSelectedFile(event.target.files[0]);
  };

  const uploadFile = async () => {
    if (!selectedFile || !presignedUrl) {
      alert("Please select a file and get a presigned URL first.");
      return;
    }

    const response = await fetch(presignedUrl, {
      method: "PUT",
      body: selectedFile,
      headers: {
        "Content-Type": fileType,
        "X-Amz-Checksum-Sha256": fileHash,
      },
    });

    if (response.ok) {
      alert("File uploaded successfully.");
    } else {
      alert("File upload failed.");
    }
  };

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
          <br />
          <br />
          <div>File Upload</div>
          <button onClick={getPresignedUrl}>Get Presigned URL</button>
          <input type="file" onChange={handleFileSelect} />
          <button onClick={uploadFile}>Upload File</button>
        </div>
      )}
    </>
  );
}

export default App;
