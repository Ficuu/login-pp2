/**
 * Un error con el código HTTP que le corresponde. Los handlers lo lanzan y el
 * middleware de errores en index.ts lo convierte en la respuesta JSON.
 */
export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(detail);
    this.name = "ErrorApi";
  }
}
