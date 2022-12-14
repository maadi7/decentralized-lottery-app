import Head from 'next/head'
import Header from '../components/Header';
import LotteryEntrance from '../components/LotteryEntry';
import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Raffle</title>
        <meta name="description" content="Generated by create next app" />
      </Head>
      <Header/>
      <LotteryEntrance/>
      
    </div>
  )
}
