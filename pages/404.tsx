import styled from "@emotion/styled";
import {keyframes} from "@emotion/react";
import Head from "next/head";

const gradient = keyframes`
  0% {
    background-position: 0 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
`;

const Container = styled.div`
  background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
  background-size: 400% 400%;
  animation: ${gradient} 15s ease infinite;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const Header = styled.h1`
  color: #fff;
  width: 100%;
  text-align: center;
  margin-bottom: 0;
`

const SubText = styled.span`
  color: #ededed;
  font-size: 1.1em;
`
const GoHome = styled.a`
  padding: 8px 16px;
  margin: 16px;
  border: 1px solid #ddd;
  color: #fff;
  :hover {
    text-decoration: none;
  }
`

export default function Custom404() {
    const description = "There doesn't appear to be anything here.";
    return (
        <Container>
            <Head>
                <title>404 - Page Not Found!</title>
                <meta name="description" content={description} />
            </Head>
            <Header>Well this is awkward...</Header>
            <SubText>There doesn't appear to be anything here!</SubText>
            <GoHome href="/">Go Home</GoHome>
        </Container>);
}
