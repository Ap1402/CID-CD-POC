export const handler = async (): Promise<any> => {
  return {
    statusCode: 200,
    body: JSON.stringify('Test deploy from github action with subfolder!!!!!'),
  };
};
