interface HomeProps {
  health: { status: string; timestamp: string } | null
}

function Home({ health }: HomeProps) {
  return (
    <div className="home">
      <h1>Hello World</h1>
      {health && (
        <div className="health-status">
          <p>API Status: {health.status}</p>
          <p>Last checked: {health.timestamp}</p>
        </div>
      )}
    </div>
  )
}

export default Home 