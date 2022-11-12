export function timeLog(msg) {
    let current = new Date();
    let currentTime  = current.toLocaleTimeString();
    console.log(`[${currentTime}]${msg}`);
}

export function FormattedDate(props) {
    return <h2>It is {props.date.toLocaleTimeString()}</h2>
  }