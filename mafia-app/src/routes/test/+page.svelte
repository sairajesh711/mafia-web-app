<script lang="ts">
  let code = '';
  let events: any[] = [];
  let ws: WebSocket | null = null;

  function connect() {
    events = [];                    // clear old logs
    ws?.close();                    // close previous socket
    ws = new WebSocket(`ws://127.0.0.1:8787/api/lobby/${code}/connect`);
    ws.onmessage = (e) => {
      const ev = JSON.parse(e.data);
      events = [...events, ev];
      console.log('WS event', ev);
    };
  }
</script>

<h1>WebSocket Proof-of-Life</h1>

<label>
  Lobby code:
  <input bind:value={code} maxlength="6" placeholder="ABC123" />
</label>
<button on:click={connect} disabled={code.length !== 6}>
  Connect
</button>

<h2>Events received:</h2>
<pre>{JSON.stringify(events, null, 2)}</pre>