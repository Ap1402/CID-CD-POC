export const handler = async (): Promise<any> => {
  const response = {
    statusCode: 200,
    body: JSON.stringify('Test deploy from github action with subfolder!!!'),
  };
  return response;
};
