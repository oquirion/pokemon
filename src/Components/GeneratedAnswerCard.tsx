import {FunctionComponent, useEffect, useState, useContext} from 'react';
import { Card, CardContent, CardActions, Button, Typography } from "@mui/material";
import { buildGeneratedAnswer, GeneratedAnswer } from '@coveo/headless';
import EngineContext from '../common/engineContext';

interface GeneratedAnswerProps {
  controller: GeneratedAnswer;
}

const GeneratedAnswerRenderer: FunctionComponent<GeneratedAnswerProps> = (props) => {
  const {controller} = props;
  const [state, setState] = useState(controller.state);

  useEffect(
    () => controller.subscribe(() => setState(controller.state)),
    [controller]
  );

  useEffect(
    () => {
      return controller.show();
      },
    [controller, state.answer]
  );

  if (!state.isVisible || state.answer === undefined) return null;

  return (
    <Card style={{ background: "gainsboro" }}>
      <CardContent>
        <Typography>{state.answer}</Typography>
      </CardContent>
      <CardActions>
        <Button onClick={() => controller.like()}>👍</Button>
        <Button onClick={() => controller.dislike()}>👎</Button>
        <Button onClick={() => controller.hide()}>Close</Button>
      </CardActions>
    </Card>
  );
};

const GeneratedAnswerCard = () => {
  const engine = useContext(EngineContext)!;
  const controller = buildGeneratedAnswer(engine);
  return <GeneratedAnswerRenderer controller={controller} />;
};

export default GeneratedAnswerCard;
